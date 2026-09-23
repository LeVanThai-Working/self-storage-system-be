import { MESSAGE_DICTIONARY } from '../common/consts/messageCode.const.ts';

export function formatMessage(code: string, args: string[] = []): string {
  let template = MESSAGE_DICTIONARY[code] || code;
  args.forEach((arg, index) => {
    template = template.replace(`{${index}}`, arg);
  });
  return template;
}
