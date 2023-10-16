import { DockerDatasource } from '../../datasource/docker';
import type { PackageDependency, PackageFileContent } from '../types';

export function extractPackageFile(content: string): PackageFileContent {
  const dep: PackageDependency = {
    packageName: 'python',
    commitMessageTopic: 'Python',
    currentValue: content.trim(),
    datasource: DockerDatasource.id,
  };
  return { deps: [dep] };
}
