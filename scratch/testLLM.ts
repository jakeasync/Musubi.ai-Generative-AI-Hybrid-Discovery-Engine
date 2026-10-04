import { getRecommendations } from '../src/lib/llm';

async function test() {
  console.log("Fetching LLM recommendations for 'lizzie borden'...");
  try {
    const res = await getRecommendations("lizzie borden");
    console.log(JSON.stringify(res, null, 2));
  } catch (e) {
    console.error(e);
  }
}

test();
