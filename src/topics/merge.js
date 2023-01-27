"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const plugins_1 = __importDefault(require("../plugins"));
const posts_1 = __importDefault(require("../posts"));
function default_1(Topics) {
    Topics.merge = function (tids, uid, options) {
        return __awaiter(this, void 0, void 0, function* () {
            // options = options || {};
            // idk if should delete this or nah
            const topicsData = yield Topics.getTopicsFields(tids, ['scheduled']);
            if (topicsData.some(t => t.scheduled)) {
                throw new Error('[[error:cant-merge-scheduled]]');
            }
            // const oldestTid = findOldestTopic(tids.map(a =>parseInt(a));
            const oldestTid = findOldestTopic(tids);
            let mergeIntoTid = oldestTid;
            if (options.mainTid) {
                mergeIntoTid = options.mainTid;
            }
            else if (options.newTopicTitle) {
                mergeIntoTid = yield createNewTopic(options.newTopicTitle, oldestTid);
            }
            const otherTids = tids.sort((a, b) => parseInt(a) - parseInt(b))
                .filter(tid => tid && parseInt(tid, 10) !== parseInt(mergeIntoTid, 10));
            for (const tid of otherTids) {
                /* eslint-disable no-await-in-loop */
                const pids = yield Topics.getPids(tid);
                for (const pid of pids) {
                    yield Topics.movePostToTopic(uid, pid, mergeIntoTid);
                }
                yield Topics.setTopicField(tid, 'mainPid', 0);
                yield Topics.delete(tid, uid);
                yield Topics.setTopicFields(tid, {
                    mergeIntoTid: mergeIntoTid,
                    mergerUid: uid,
                    mergedTimestamp: Date.now(),
                });
            }
            yield Promise.all([
                posts_1.default.updateQueuedPostsTopic(mergeIntoTid, otherTids),
                updateViewCount(mergeIntoTid, tids),
            ]);
            plugins_1.default.hooks.fire('action:topic.merge', {
                uid: uid,
                tids: tids,
                mergeIntoTid: mergeIntoTid,
                otherTids: otherTids,
            });
            return mergeIntoTid;
        });
    };
    function createNewTopic(title, oldestTid) {
        return __awaiter(this, void 0, void 0, function* () {
            const topicData = yield Topics.getTopicFields(parseInt(oldestTid, 10), ['uid', 'cid']);
            const params = {
                uid: topicData.uid,
                cid: topicData.cid,
                title: title,
            };
            const result = yield plugins_1.default.hooks.fire('filter:topic.mergeCreateNewTopic', {
                oldestTid: oldestTid,
                params: params,
            });
            const tid = yield Topics.create(result.params);
            return tid;
        });
    }
    function updateViewCount(mergeIntoTid, tids) {
        return __awaiter(this, void 0, void 0, function* () {
            const topicData = yield Topics.getTopicsFields(tids, ['viewcount']);
            const totalViewCount = topicData.reduce((count, topic) => count + parseInt(topic.viewcount, 10), 0);
            yield Topics.setTopicField(mergeIntoTid, 'viewcount', totalViewCount);
        });
    }
    function findOldestTopic(tids) {
        return Math.min.apply(null, tids.map(a => parseInt(a, 10)));
    }
}
exports.default = default_1;
