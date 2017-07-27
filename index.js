const request = require('request');
const __ = require('lodash');
const async = require('async');
const neodoc = require('neodoc');

const doc = 'Usage:\n' +
'  zagallo [options] <url> <word>\n' +
'Options:\n' +
'  -d, --delay <delay>      Time to wait between reactions. [default: 600]\n' +
'  -c, --cowboy             Do not check for failures. Good for show off. Bad for consistency. Ignore all following options.\n' +
'  -r, --retries <retries>  Number of retries on each reaction. [default: 3]\n' +
'  -p, --perfect            Fail on c-c-c-combo-breaking.\n' +
'  -a, --allow-failures     Do not remove all previous reactions on failure or c-c-c-combo-breaking.\n' +
'  -v, --version            Show the version.\n' +
'  -h, --help               Show this help.\n';

const opts = neodoc.run(doc, {
  laxPlacement: true,
  smartOptions: true,
  versionFlags: ['-v', '--version']
});

const TOKEN = "xoxp-2164313994-18782410023-201005159461-ce1c29cec96c1aaefa5105d300757f50";
const url = opts['<url>'];
const word = opts['<word>'];
const retries = opts['-r'];
const delay = opts['-d'];
const removeOnFail = !opts['-a'];
const perfect = opts['-p'];
const cowboy = opts['-c'];

const channel = (/\/archives\/([A-Z0-9]+)\/p\d+/.exec(url) || [])[1];
const tmpts = (/\/p(\d+)/.exec(url) || [])[1];
const file = (/\/files\/[^\/]+\/([A-Z0-9]+)\//.exec(url) || [])[1];

var timestamp = null;
if (tmpts) {
  timestamp = tmpts.slice(0, 10) + '.' + tmpts.slice(10);
}

const emojiMapping = {
  'a': ['a', 'amazon', 'cb3', 'pay2', 'y1', 'y3', '5social', 'arroba', 'arch'],
  'b': ['b', 'bill1'],
  'c': ['c', 'cabify', 'cb1', '3social', 'cocoapods', 'checkpoint'],
  'd': ['d', 'd2'],
  'e': ['pay5', 'cb6', '4money', 'y5', 'emacs'],
  'f': ['facebook', 'f'],
  'g': ['cb5', 'grammarnazi'],
  'h': ['cb2', 'h'],
  'i': ['bill2', '4social', 'information_source'],
  'j': ['juventus', 'j'],
  'k': ['k', 'k2'],
  'l': ['bill3', 'bill4', 'y6', '6social'],
  'm': ['1money', 'pay4', 'y2', 'm', 'mc'],
  'n': ['neovim', 'pay6', '3money'],
  'o': ['o', '2money', 'o2', 'y7', 'orkut', '2social'],
  'p': ['pay1', 'pinterest', 'parking'],
  'q': ['q', 'q2'],
  'r': ['cb4', 'cb7', 'y4', 'registered'],
  's': ['pay8', 'bill5', '1social'],
  't': ['pay7', 't'],
  'u': ['u-300', 'u'],
  'v': ['v2', 'v3'],
  'w': ['w', 'vw'],
  'x': ['x', 'heavy_multiplication_x', 'negative_squared_cross_mark'],
  'y': ['5money', 'pay3'],
  'z': ['z', 'z2'],
  '0': ['zero'],
  '1': ['one'],
  '2': ['two'],
  '3': ['three'],
  '4': ['four'],
  '5': ['five'],
  '6': ['six'],
  '7': ['seven'],
  '8': ['eight'],
  '9': ['nine'],
  '!': ['exclamation', 'grey_exclamation'],
  '?': ['marioquestion', 'question', 'grey_question'],
  '.': ['dot'],
  ',': ['comma'],
  ' ': ['space', 'space2', 'space3', 'space4'],
};

const pathParams = function(emoji) {
  if (file) {
    return '?token=' + TOKEN + '&name=' + emoji + '&file=' + file + '&pretty=1';
  } else {
    return '?token=' + TOKEN + '&name=' + emoji + '&channel=' + channel + '&timestamp=' + timestamp + '&pretty=1';
  }
};

const checkWord = function(word) {
  const sanitized = word.toLowerCase().replace(/[^a-z0-9.,?! ]/gi, '');
  if (sanitized.length > 23) {
    console.error('You cannot react more than 23 times in a single message.');
    process.exit(1);
  }

  const hasEmojis = __(sanitized)
    .map()
    .countBy()
    .reduce(function(memo, v, k) {
      console.log(k, v, emojiMapping[k]);
      return memo && emojiMapping[k] && emojiMapping[k].length >= v;
    }, true);

  if (!hasEmojis) {
    console.error('Invalid word, please add more emojis.');
    process.exit(1);
  }
  return true;
};

const word2Emoji = function(word) {
  var counter = {};
  return __(word.toLowerCase().replace(/[^a-z0-9.,?! ]/gi, ''))
    .map(function(l) {
      counter[l] = (!!counter[l] || counter[l] === 0) ? counter[l] + 1 : 0;
      return emojiMapping[l][counter[l]];
    })
    .value();
};

const arrayContains = function(a1, a2) {
  if (a1.length !== a2.length && perfect) return false;
  for (var i = 0; i < a1.length; i++) {
    if (a1[i] !== a2[i]) return false;
  }
  return true;
};

const postEmojis = function(emojiList) {
  request({
    url: 'https://slack.com/api/reactions.get' + pathParams('')
  }, function(e, i, b) {
    var reactions = __.map((JSON.parse(b)[file ? 'file' : 'message'] || {}).reactions || [], 'name');
    async.mapSeries(emojiList, function(emoji, done) {
      async.retry(retries, function(reacted) {
        setTimeout(function() {
          console.log('\n------- trying', emoji);
          request({
            method: 'post',
            url: 'https://slack.com/api/reactions.add' + pathParams(emoji),
          }, function() {
            if (cowboy) {
              reacted();
              return;
            }

            request({
              url: 'https://slack.com/api/reactions.get' + pathParams(emoji),
            }, function(e, i, body) {
              var newReactions = __.map((JSON.parse(body)[file ? 'file' : 'message'] || {}).reactions || [], 'name');
              console.log('reactions:', reactions.join(','));
              console.log('newReactions:', newReactions.join(','));

              if (arrayContains(perfect ? reactions.concat(emoji) : reactions, newReactions)) {
                reactions = newReactions;
                console.log('ok');
                reacted();
              } else {
                console.log('not');
                request({
                  method: 'post',
                  url: 'https://slack.com/api/reactions.remove' + pathParams(emoji),
                }, function() {
                  reacted('error');
                });
              }
            });
          });
        }, delay);
      }, done);
    }, function(error) {
      if (error && removeOnFail) {
        console.log('error: removing all');
        removeEmojis(reactions);
      }
    });
  });
};

const removeEmojis = function(emojiList) {
  async.mapSeries(emojiList, function(emoji, done) {
    console.log('\n------- removing', emoji);
    request({
      method: 'post',
      url: 'https://slack.com/api/reactions.remove' + pathParams(emoji)
    }, function() {
      done();
    });
  });
};

if (checkWord(word)) {
  postEmojis(word2Emoji(word));
}
