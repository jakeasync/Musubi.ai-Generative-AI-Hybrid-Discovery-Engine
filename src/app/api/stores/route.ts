import { NextResponse } from "next/server";
import { claudeComplete, extractJson } from "@/lib/claude";

type Store = { id: string; name: string; url: string; reason: string; available?: boolean };

async function getJson(url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const { title, author, openLibraryKey } = await req.json();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const q = encodeURIComponent(`${title} ${author || ""}`.trim());

  const [gb, ol] = await Promise.all([
    getJson(
      `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(`"${title}"`)}${
        author ? `+inauthor:${encodeURIComponent(`"${author}"`)}` : ""
      }&maxResults=3`
    ),
    openLibraryKey
      ? getJson(
          `https://openlibrary.org/search.json?q=key:${encodeURIComponent(openLibraryKey)}&fields=key,ebook_access,has_fulltext`
        )
      : Promise.resolve(null),
  ]);

  const vol = gb?.items?.[0];
  const isbn13 = vol?.volumeInfo?.industryIdentifiers?.find((i: any) => i.type === "ISBN_13")?.identifier;
  const sale = vol?.saleInfo;
  const facts = {
    googleBooksSaleability: sale?.saleability ?? "UNKNOWN",
    googleBooksBuyLink: sale?.buyLink ?? null,
    googleBooksEbookAvailable: !!vol?.accessInfo?.epub?.isAvailable,
    openLibraryEbookAccess: ol?.docs?.[0]?.ebook_access ?? "unknown",
  };

  const canBuyOnGoogle = facts.googleBooksSaleability === "FOR_SALE" && facts.googleBooksBuyLink;
  const canBorrow = ["borrowable", "public"].includes(facts.openLibraryEbookAccess);

  const catalog: Store[] = [
    { id: "bookshop", name: "Bookshop.org", url: `https://bookshop.org/search?keywords=${q}`, reason: "" },
    { id: "amazon", name: "Amazon", url: `https://www.amazon.com/s?k=${q}`, reason: "" },
    { id: "audible", name: "Audible", url: `https://www.audible.com/search?keywords=${q}`, reason: "" },
    {
      id: "bn",
      name: "Barnes & Noble",
      // Link by ISBN-13 when indexed, fallback to site search
      url: isbn13
        ? `https://www.barnesandnoble.com/w/?ean=${isbn13}`
        : `https://www.google.com/search?q=${encodeURIComponent(`site:barnesandnoble.com ${title} ${author || ""}`)}`,
      reason: "",
    },
    {
      id: "library",
      name: "Borrow free (Open Library)",
      url: openLibraryKey ? `https://openlibrary.org${openLibraryKey}` : `https://openlibrary.org/search?q=${q}`,
      reason: "",
      available: canBorrow,
    },
    {
      id: "google",
      name: "Google Play Books",
      url: canBuyOnGoogle ? facts.googleBooksBuyLink! : `https://play.google.com/store/search?q=${q}&c=books`,
      reason: "",
      available: !!canBuyOnGoogle,
    },
    { id: "goodreads", name: "Goodreads", url: `https://www.goodreads.com/search?q=${q}`, reason: "" },
  ];

  let ranked: { id: string; reason: string }[] = [];
  try {
    const text = await claudeComplete({
      maxTokens: 500,
      temperature: 0.2,
      prompt: `A reader wants to get the book "${title}" by ${author || "unknown author"}.
Verified availability facts (the ONLY facts you may rely on): ${JSON.stringify(facts)}
Store ids you can choose from: ${catalog.map((s) => s.id).join(", ")}.
Pick the 4 best stores for this book in order, each with a short reason (max 10 words).
Never claim a store has the book in stock; only use the facts above (e.g. free to borrow, ebook for sale).
Respond ONLY with JSON: {"stores":[{"id":"string","reason":"string"}]}`,
    });
    ranked = (extractJson(text).stores || []).filter((s: any) => catalog.some((c) => c.id === s.id));
  } catch (e) {
    console.error("Stores AI ranking failed:", e);
  }

  const order = ranked.length
    ? ranked
    : catalog.slice(0, 4).map((s) => ({ id: s.id, reason: "" }));

  const stores = order.slice(0, 4).map((r) => ({ ...catalog.find((c) => c.id === r.id)!, reason: r.reason }));

  return NextResponse.json({ stores, facts, aiRanked: ranked.length > 0 });
}
