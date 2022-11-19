import fs from "fs";
import { globby } from "globby";
import { optimize } from "svgo";
import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";

const getPascalCase = (v) =>
  v
    .replaceAll(/(_|-| )+/g, " ")
    .split(" ")
    .map((v) => v.charAt(0).toUpperCase() + v.slice(1))
    .join("");

const getFilePathsFromInput = async (input) => {
  return globby(`${input}/*.svg`, { onlyFiles: true, unique: true });
};

const readSvg = (path) => fs.readFileSync(path).toString("utf-8").trim();

const write = (rawData, name, path, extension) => {
  let data = rawData;
  if (extension === "tsx") {
    const rd = rawData.replace(/^(<svg(.*?[^?])?)(>.*)$/, "$1 {...props}$3");
    data = `import { Component, ComponentProps } from 'solid-js';\r\n\r\nexport const Icon${name}: Component<ComponentProps<"svg">> = (props) => ${rd};`;
  } else if (extension === "jsx") {
    data = `export const Icon${name} = () => ${rawData};`;
  }
  fs.writeFile(
    `${path.replace(/\/$/, "")}/Icon${name}.${extension}`,
    Buffer.from(data, "utf-8"),
    (err) => err && console.error(err)
  );
};

yargs(hideBin(process.argv))
  .command(
    "convert (input) (output)",
    "convert svg to solidjs",
    (yargs) => {
      return yargs
        .positional("input", {
          describe: "folder with svg",
        })
        .positional("output", {
          describe: "folder to output jsx/tsx",
        });
    },
    async (argv) => {
      const type = argv.type;
      const input = argv["(input)"];
      const output = argv["(output)"];
      const filePaths = await getFilePathsFromInput(input);
      fs.mkdirSync(output, { recursive: true });
      filePaths.forEach((filePath) => {
        const name = getPascalCase(
          filePath.split("/").reverse()[0].split(".")[0]
        );
        const rawSvg = readSvg(filePath);
        const optimizedSvg = optimize(rawSvg).data;
        write(optimizedSvg, name, output, type);
      });

      console.log(
        `${filePaths.length} svg files converted to ${output} with ${type} extension`
      );
    }
  )
  .option("type", {
    alias: "t",
    type: "string",
    description: "type of output",
    default: "tsx",
    choices: ["tsx", "jsx"],
  })
  .parse();

/**
 * import glob
import re

toTSXFiles = []

for file in files:
    name = pascal_case(file.split("/")[-1].split(".")[0])
    f = open(file, "r")
    content = f.readline()
    f.close()
    svg = re.sub(r'class=\"[a-zA-Z0-9- ]+\"', "viewBox=\"0 0 24 24\" {...props}", content)
    toTSXFiles.append(f"export * from \"./icon{name}.tsx\";")
    f = open(f"./tsx/icon{name}.tsx", "w")
    f.write("\r\n".join(["import { Component, ComponentProps } from \"solid-js\";", "", f"export const Icon{name}: Component<ComponentProps<\"svg\">> = (props) => (", svg, ");"]))
    f.close()

f = open("./index.ts", "w")
f.write("\r\n".join(toTSXFiles))
f.close()
 */
