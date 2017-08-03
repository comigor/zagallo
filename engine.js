import request from 'request';
import async from 'async';
import __ from 'lodash';
import { pathParams, arrayContains } from './utils';

const slackResponseToReactions = (body, { file }) => {
  const message = JSON.parse(body)[file ? 'file' : 'message'] || {};
  const obj = message.comment || message;
  return __.map(obj.reactions || [], 'name');
};

export const postEmojis = (emojiList, parsedUrl, { perfect, removeOnFail, cowboy, retries, delay }) => {
  request({
    url: 'https://slack.com/api/reactions.get' + pathParams('', parsedUrl)
  }, (e, i, b) => {
    let reactions = slackResponseToReactions(b, parsedUrl);
    
    async.mapSeries(emojiList, (emoji, done) => {
      async.retry(retries, (reacted) => {
        setTimeout(() => {
          console.log('\n------- trying', emoji);
          request({
            method: 'post',
            url: 'https://slack.com/api/reactions.add' + pathParams(emoji, parsedUrl)
          }, () => {
            if (cowboy) {
              return reacted();
            }

            request({
              url: 'https://slack.com/api/reactions.get' + pathParams(emoji, parsedUrl)
            }, (e, i, body) => {
              const newReactions = slackResponseToReactions(body, parsedUrl);
              console.log('reactions:', reactions.join(','));
              console.log('newReactions:', newReactions.join(','));

              if (arrayContains(perfect ? reactions.concat(emoji) : reactions, newReactions, perfect)) {
                reactions = newReactions;
                console.log('ok');
                reacted();
              } else {
                console.log('not');
                request({
                  method: 'post',
                  url: 'https://slack.com/api/reactions.remove' + pathParams(emoji, parsedUrl)
                }, () => reacted('error'));
              }
            });
          });
        }, delay);
      }, done);
    }, (error) => {
      if (error && removeOnFail) {
        console.log('error: removing all');
        removeEmojis(reactions, parsedUrl);
      }
    });
  });
};

const removeEmojis = (emojiList, parsedUrl) => {
  async.mapSeries(emojiList, (emoji, done) => {
    console.log('\n------- removing', emoji);
    request({
      method: 'post',
      url: 'https://slack.com/api/reactions.remove' + pathParams(emoji, parsedUrl)
    }, () => done());
  });
};
