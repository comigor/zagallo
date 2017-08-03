import __ from 'lodash';
import emojiMap from './emoji-map';

export const parseOptions = (opts) => {
  return {
    TOKEN: process.env.SLACK_TOKEN,
    url: opts['<url>'],
    word: opts['<word>'],
    retries: opts['-r'],
    delay: opts['-d'],
    removeOnFail: !opts['-a'],
    perfect: opts['-p'],
    cowboy: opts['-c']
  };
};

export const parseUrl = ({ TOKEN, url }) => {
  if (!TOKEN) {
    console.error('Missing SLACK_TOKEN.');
    process.exit(1);
  }

  const channel = (/\/archives\/([A-Z0-9]+)\/p\d+/.exec(url) || [])[1];
  const file = (/\/files\/[^\/]+\/([A-Z0-9]+)\//.exec(url) || [])[1];
  const tmpts = (/\/p(\d+)/.exec(url) || [])[1];
  const timestamp = tmpts ? tmpts.slice(0, 10) + '.' + tmpts.slice(10) : null;

  return { TOKEN, channel, file, timestamp };
};

export const pathParams = (emoji, { TOKEN, file, channel, timestamp }) => {
  if (file) {
    return `?token=${TOKEN}&name=${emoji}&file=${file}&pretty=1`;
  } else {
    return `?token=${TOKEN}&name=${emoji}&channel=${channel}&timestamp=${timestamp}&pretty=1`;
  }
};

export const checkWord = (word) => {
  const sanitized = word.toLowerCase().replace(/[^a-z0-9.,?! ]/gi, '');
  if (sanitized.length > 23) {
    console.error('You cannot react more than 23 times in a single message.');
    process.exit(1);
  }

  const hasEmojis = __(sanitized)
    .map()
    .countBy()
    .reduce((memo, v, k) => {
      console.log(k, v, emojiMap[k]);
      return memo && emojiMap[k] && emojiMap[k].length >= v;
    }, true);

  if (!hasEmojis) {
    console.error('Invalid word, please add more emojis.');
    process.exit(1);
  }
  return true;
};

export const word2Emoji = (word) => {
  let counter = {};
  return __(word.toLowerCase().replace(/[^a-z0-9.,?! ]/gi, ''))
    .map((l) => {
      counter[l] = (!!counter[l] || counter[l] === 0) ? counter[l] + 1 : 0;
      return emojiMap[l][counter[l]];
    })
    .value();
};

export const arrayContains = function(a1, a2, perfect = false) {
  if (a1.length !== a2.length && perfect) return false;
  for (let i = 0; i < a1.length; i++) {
    if (a1[i] !== a2[i]) return false;
  }
  return true;
};