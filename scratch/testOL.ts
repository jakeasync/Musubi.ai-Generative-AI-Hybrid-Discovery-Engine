import { verifyBook } from '../src/lib/openLibrary';

async function test() {
  console.log("Testing Lizzie Borden...");
  const res = await verifyBook("Lizzie Borden", "Unknown");
  console.log("Lizzie Borden res:", res);

  console.log("Testing In Cold Blood...");
  const res2 = await verifyBook("In Cold Blood", "Truman Capote");
  console.log("In Cold Blood res:", res2);
}

test();
