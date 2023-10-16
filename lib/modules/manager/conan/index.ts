export { extractPackageFile } from './extract';
import type { Category } from '../../../constants';
export { getRangeStrategy } from './range';
import { ConanDatasource } from '../../datasource/conan';

export const defaultConfig = {
  fileMatch: ['(^|/)conanfile\\.(txt|py)$'],
  enabled: false, // See https://github.com/renovatebot/renovate/issues/14170
};

export const categories: Category[] = ['c'];

export const supportedDatasources = [ConanDatasource.id];
