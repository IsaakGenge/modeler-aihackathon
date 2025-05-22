import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sortByName',
  standalone: true
})
export class SortListPipe implements PipeTransform {
  transform<T>(array: T[], nameProperty: string = 'name'): T[] {
    if (!Array.isArray(array)) {
      return array;
    }

    return [...array].sort((a: any, b: any) => {
      const nameA = a?.[nameProperty]?.toString().toLowerCase() || '';
      const nameB = b?.[nameProperty]?.toString().toLowerCase() || '';
      return nameA.localeCompare(nameB);
    });
  }
}
