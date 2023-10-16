import { logger } from '../../../logger';
import { RubyVersionDatasource } from '../../datasource/ruby-version';
import type { PackageDependency, PackageFileContent } from '../types';

export function extractPackageFile(content: string): PackageFileContent {
  logger.trace('ruby-version.extractPackageFile()');
  const dep: PackageDependency = {
    packageName: 'ruby',
    currentValue: content.trim(),
    datasource: RubyVersionDatasource.id,
  };
  return { deps: [dep] };
}
