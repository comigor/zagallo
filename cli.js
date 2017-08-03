import neodoc from 'neodoc';
import { parseOptions, parseUrl, checkWord, word2Emoji } from './utils';
import { postEmojis } from './engine';

const doc = `Usage:
  zagallo [options] <url> <word>
Options:
  -d, --delay <delay>      Time to wait between reactions. [default: 600]
  -c, --cowboy             Do not check for failures. Good for show off. Bad for consistency. Ignore all following options.
  -r, --retries <retries>  Number of retries on each reaction. [default: 3]
  -p, --perfect            Fail on c-c-c-combo-breaking.
  -a, --allow-failures     Do not remove all previous reactions on failure or c-c-c-combo-breaking.
  -v, --version            Show the version.
  -h, --help               Show this help.`;

const opts = neodoc.run(doc, {
  laxPlacement: true,
  smartOptions: true,
  versionFlags: ['-v', '--version']
});

const options = parseOptions(opts);
const parsedUrl = parseUrl(options);

if (checkWord(options.word)) {
  const emojiList = word2Emoji(options.word);
  postEmojis(emojiList, parsedUrl, options);
}
