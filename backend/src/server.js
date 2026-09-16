import "dotenv/config";
import { validateEnv } from "./config/validateEnv.js";

validateEnv();

const { default: app } = await import("./app.js");

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`UPNEX API running on http://localhost:${port}`);
});