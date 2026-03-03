import dayjs from 'dayjs'
import 'dayjs/locale/ru';
export function formatDate(date: string | Date) {
  return dayjs(date).locale('ru').format('DD.MM.YYYY (dd) HH:mm')
}
