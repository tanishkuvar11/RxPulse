const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const {
  FiActivity, FiHeart, FiShield, FiWatch, FiClipboard,
  FiDatabase, FiLock, FiCheckCircle, FiTrendingUp, FiPieChart,
  FiAlertTriangle, FiSlash, FiPackage, FiGrid, FiMessageCircle,
} = require("react-icons/fi");

const OUT = path.join(__dirname, "icons");
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const AMBER = "#D9A441";
const SLATE = "#8FA0AC";

const icons = {
  activity: FiActivity,
  heart: FiHeart,
  shield: FiShield,
  watch: FiWatch,
  clipboard: FiClipboard,
  database: FiDatabase,
  lock: FiLock,
  check: FiCheckCircle,
  trend: FiTrendingUp,
  pie: FiPieChart,
  alert: FiAlertTriangle,
  slash: FiSlash,
  package: FiPackage,
  grid: FiGrid,
  message: FiMessageCircle,
};

async function main() {
  for (const [name, Comp] of Object.entries(icons)) {
    for (const [suffix, color] of [["amber", AMBER], ["slate", SLATE], ["white", "#E8EDF0"], ["ground", "#0E1419"]]) {
      const svg = ReactDOMServer.renderToStaticMarkup(
        React.createElement(Comp, { size: 256, color, strokeWidth: 1.6 })
      );
      const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${svg.replace(/<svg[^>]*>|<\/svg>/g, "")}</svg>`;
      const buf = await sharp(Buffer.from(fullSvg)).resize(256, 256).png().toBuffer();
      fs.writeFileSync(path.join(OUT, `${name}_${suffix}.png`), buf);
    }
  }
  console.log("icons written:", Object.keys(icons).length * 4);
}

main().catch((e) => { console.error(e); process.exit(1); });
