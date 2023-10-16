import { logger } from '../../../logger';
import { getSiblingFileName, localPathExists } from '../../../util/fs';
import { newlineRegex, regEx } from '../../../util/regex';
import { coerceString } from '../../../util/string';
import { GitTagsDatasource } from '../../datasource/git-tags';
import { GithubTagsDatasource } from '../../datasource/github-tags';
import { GitlabTagsDatasource } from '../../datasource/gitlab-tags';
import { PodDatasource } from '../../datasource/pod';
import type { PackageDependency, PackageFileContent } from '../types';
import type { ParsedLine } from './types';

const regexMappings = [
  regEx(`^\\s*pod\\s+(['"])(?<spec>[^'"/]+)(/(?<subspec>[^'"]+))?(['"])`),
  regEx(
    `^\\s*pod\\s+(['"])[^'"]+(['"])\\s*,\\s*(['"])(?<currentValue>[^'"]+)(['"])\\s*$`
  ),
  regEx(`,\\s*:git\\s*=>\\s*(['"])(?<git>[^'"]+)(['"])`),
  regEx(`,\\s*:tag\\s*=>\\s*(['"])(?<tag>[^'"]+)(['"])`),
  regEx(`,\\s*:path\\s*=>\\s*(['"])(?<path>[^'"]+)(['"])`),
  regEx(`^\\s*source\\s*(['"])(?<source>[^'"]+)(['"])`),
];

export function parseLine(line: string): ParsedLine {
  let result: ParsedLine = {};
  if (!line) {
    return result;
  }
  for (const regex of Object.values(regexMappings)) {
    const match = regex.exec(line.replace(regEx(/#.*$/), ''));
    if (match?.groups) {
      result = { ...result, ...match.groups };
    }
  }

  if (result.spec) {
    const packageName = result.subspec
      ? `${result.spec}/${result.subspec}`
      : result.spec;
    const groupName = result.spec;
    if (packageName) {
      result.packageName = packageName;
    }
    if (groupName) {
      result.groupName = groupName;
    }
    delete result.spec;
    delete result.subspec;
  }

  return result;
}

export function gitDep(parsedLine: ParsedLine): PackageDependency | null {
  const { packageName: depName, git, tag } = parsedLine;

  if (!git) {
    return null;
  }

  const platformMatch = regEx(
    /[@/](?<platform>github|gitlab)\.com[:/](?<account>[^/]+)\/(?<repo>[^/]+)/
  ).exec(coerceString(git));

  if (platformMatch?.groups) {
    const { account, repo, platform } = platformMatch.groups;
    if (account && repo) {
      const datasource =
        platform === 'github'
          ? GithubTagsDatasource.id
          : GitlabTagsDatasource.id;
      return {
        datasource,
        depName,
        packageName: `${account}/${repo.replace(regEx(/\.git$/), '')}`,
        currentValue: tag,
      };
    }
  }

  return {
    datasource: GitTagsDatasource.id,
    depName,
    packageName: git,
    currentValue: tag,
  };
}

export async function extractPackageFile(
  content: string,
  packageFile: string
): Promise<PackageFileContent | null> {
  logger.trace(`cocoapods.extractPackageFile(${packageFile})`);
  const deps: PackageDependency[] = [];
  const lines: string[] = content.split(newlineRegex);

  const registryUrls: string[] = [];

  for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
    const line = lines[lineNumber];
    const parsedLine = parseLine(line);
    const {
      packageName,
      groupName,
      currentValue,
      git,
      tag,
      path,
      source,
    }: ParsedLine = parsedLine;

    if (source) {
      registryUrls.push(source.replace(regEx(/\/*$/), ''));
    }

    if (packageName) {
      const managerData = { lineNumber };
      let dep: PackageDependency = {
        packageName,
        groupName,
        skipReason: 'unspecified-version',
      };

      if (currentValue) {
        dep = {
          packageName,
          groupName,
          datasource: PodDatasource.id,
          currentValue,
          managerData,
          registryUrls,
        };
      } else if (git) {
        if (tag) {
          const gitDepRes = gitDep(parsedLine);
          if (gitDepRes) {
            dep = { ...gitDepRes, managerData };
          }
        } else {
          dep = {
            packageName,
            groupName,
            skipReason: 'git-dependency',
          };
        }
      } else if (path) {
        dep = {
          packageName,
          groupName,
          skipReason: 'path-dependency',
        };
      }

      deps.push(dep);
    }
  }
  const res: PackageFileContent = { deps };
  const lockFile = getSiblingFileName(packageFile, 'Podfile.lock');
  // istanbul ignore if
  if (await localPathExists(lockFile)) {
    res.lockFiles = [lockFile];
  }
  return res;
}
