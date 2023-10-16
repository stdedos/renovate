import parseGithubUrl from 'github-url-from-git';
import { z } from 'zod';
import { logger } from '../../../../logger';
import { regEx } from '../../../../util/regex';
import { GithubReleasesDatasource } from '../../../datasource/github-releases';
import type { PackageDependency } from '../../types';

const githubUrlRegex = regEx(
  /^https:\/\/github\.com\/(?<packageName>[^/]+\/[^/]+)/
);

function githubPackageName(input: string): string | undefined {
  // istanbul ignore if
  if (!input.startsWith('https://')) {
    logger.once.info({ url: input }, `Bazel: non-https git_repository URL`);
  }
  return parseGithubUrl(input)?.match(githubUrlRegex)?.groups?.packageName;
}

export const gitRules = ['git_repository', '_git_repository'] as const;

export const GitTarget = z
  .object({
    rule: z.enum(gitRules),
    name: z.string(),
    tag: z.string().optional(),
    commit: z.string().optional(),
    remote: z.string(),
  })
  .refine(({ tag, commit }) => !!tag || !!commit)
  .transform(({ rule, name, tag, commit, remote }): PackageDependency[] => {
    let currentValue: string | undefined;
    let currentDigest: string | undefined;
    let datasource: string | undefined;
    let packageName = name;

    if (tag) {
      currentValue = tag;
    }

    if (commit) {
      currentDigest = commit;
    }

    const githubPackage = githubPackageName(remote);
    if (githubPackage) {
      datasource = GithubReleasesDatasource.id;
      packageName = githubPackage;
    }

    if (!datasource) {
      return [];
    }

    const dep: PackageDependency = {
      datasource,
      packageName,
      currentValue,
      currentDigest,
    };

    return [dep];
  });
