import * as child_process from "child_process";
import { mocked } from "ts-jest/utils";
import { getDiffForFile, getRangesForDiff } from "./git";
import { hunks, includingOnlyRemovals } from "./__fixtures__/diff";

jest.mock("child_process");

const mockedChildProcess = mocked(child_process, true);

describe("git", () => {
  it("should find the ranges of each staged file", () => {
    expect(getRangesForDiff(hunks)).toMatchSnapshot();
  });

  it("should work for hunks which include only-removal-ranges", () => {
    expect(getRangesForDiff(includingOnlyRemovals)).toMatchSnapshot();
  });

  it("should get the staged diff of a file", () => {
    mockedChildProcess.execSync.mockReturnValue(Buffer.from(hunks));

    const diffFromFile = getDiffForFile("./mockfile.js");

    expect(mockedChildProcess.execSync).toHaveBeenCalled();
    expect(diffFromFile).toContain("diff --git");
    expect(diffFromFile).toContain("@@");
  });

  it("should hit the cached diff of a file", () => {
    jest.mock("child_process").resetAllMocks();
    mockedChildProcess.execSync.mockReturnValue(Buffer.from(hunks));

    const diffFromFileA = getDiffForFile("./mockfileCache.js");
    const diffFromFileB = getDiffForFile("./mockfileCache.js");
    expect(mockedChildProcess.execSync).toHaveBeenCalledTimes(1);
    expect(diffFromFileA).toEqual(diffFromFileB);

    getDiffForFile("./mockfileMiss.js");
    expect(mockedChildProcess.execSync).toHaveBeenCalledTimes(2);
  });
});
