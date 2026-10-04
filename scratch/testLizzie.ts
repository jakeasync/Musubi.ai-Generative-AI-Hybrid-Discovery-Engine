import { verifyBook } from '../src/lib/openLibrary';

async function test() {
  console.log("Testing The Trial of Lizzie Borden...");
  const res = await verifyBook("The Trial of Lizzie Borden", "Cara Robertson");
  console.log("Res:", res);
}

test();
