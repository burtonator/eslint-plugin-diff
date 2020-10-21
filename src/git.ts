import * as child_process from "child_process";
import * as path from "path";
import { Range } from "./Range";

const sanitizeFilePath = (filePath: string) =>
  JSON.stringify(path.resolve(filePath));

const diffCacheKey = (filePath: string, staged: boolean): string =>
  JSON.stringify([path.resolve(filePath), staged]);

const diffCache = new Map<string, string>();

const getDiffForFile = (filePath: string, staged = false): string => {
  // Get diff entry from cache
  const cachedDiff = diffCache.get(diffCacheKey(filePath, staged));
  if (cachedDiff) {
    // If entry is not falsy return it
    return cachedDiff;
  } else {
    // Otherwise spawn child_process set it in cache and return it
    const diff = child_process
      .execSync(
        `git diff --diff-filter=ACM --unified=0 HEAD ${
          staged ? " --staged" : ""
        } -- ${sanitizeFilePath(filePath)}`
      )
      .toString();
    diffCache.set(diffCacheKey(filePath, staged), diff);
    return diff;
  }
};

const isHunkHeader = (input: string) => {
  const hunkHeaderRE = new RegExp(/^@@ .* @@/g);
  return input.match(hunkHeaderRE);
};

const getRangeForChangedLines = (line: string) => {
  const rangeRE = new RegExp(
    /^@@ .* \+(?<start>\d+)(?<linesCountDelimiter>,(?<linesCount>\d+))? @@/
  );
  const range = rangeRE.exec(line);
  if (range === null) {
    throw Error(`Couldn't match regex with line '${line}'`);
  }
  if (range.groups?.start === undefined) {
    /*
     * NOTE: Never happens, because RegExp requires start to be a
     * required number
     */
    throw Error("Couldn't match regex to find start");
  }

  const linesCount: number =
    range.groups?.linesCountDelimiter && range.groups?.linesCount
      ? parseInt(range.groups.linesCount)
      : 1;

  const hasAddedLines = linesCount !== 0;
  const start: number = parseInt(range.groups?.start);
  const end = start + linesCount;

  return hasAddedLines ? new Range(start, end) : null;
};

const removeNullRanges = (r: Range | null): r is Range => r !== null;

const getRangesForDiff = (diff: string): Range[] => {
  return diff
    .split("\n")
    .filter(isHunkHeader)
    .map(getRangeForChangedLines)
    .filter(removeNullRanges);
};

export { getDiffForFile, getRangesForDiff };
export type { Range };
