import { logger } from '../../../logger';
import { regEx } from '../../../util/regex';
import { NpmDatasource } from '../../datasource/npm';
import type { PackageDependency, PackageFileContent } from '../types';

export function extractPackageFile(
  content: string,
  packageFile?: string
): PackageFileContent | null {
  let deps: PackageDependency[] = [];
  const npmDepends = regEx(/\nNpm\.depends\({([\s\S]*?)}\);/).exec(content);
  if (!npmDepends) {
    return null;
  }
  try {
    deps = npmDepends[1]
      .replace(regEx(/(\s|\\n|\\t|'|")/g), '')
      .split(',')
      .map((dep) => dep.trim())
      .filter((dep) => dep.length)
      .map((dep) => dep.split(regEx(/:(.*)/)))
      .map((arr) => {
        const [packageName, currentValue] = arr;
        // istanbul ignore if
        if (!(packageName && currentValue)) {
          logger.warn({ content }, 'Incomplete npm.depends match');
        }
        return {
          packageName,
          currentValue,
          datasource: NpmDatasource.id,
        };
      })
      .filter((dep) => dep.packageName && dep.currentValue);
  } catch (err) /* istanbul ignore next */ {
    logger.warn({ err, packageFile }, 'Failed to parse meteor package.js');
  }
  // istanbul ignore if
  if (!deps.length) {
    return null;
  }
  return { deps };
}
