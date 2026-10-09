import SearchLog from '../models/SearchLog.js';
import { ApiError } from '../utils/ApiError.js';

function boundedDays(value) {
  return Math.min(Math.max(Number(value) || 7, 1), 90);
}

function boundedLimit(value) {
  return Math.min(Math.max(Number(value) || 10, 1), 50);
}

export async function getSearchAnalytics({ days = 7, limit = 10 } = {}) {
  const safeDays = boundedDays(days);
  const safeLimit = boundedLimit(limit);
  const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

  const [summary, topQueries, zeroResultQueries, modeUsage, daily] = await Promise.all([
    SearchLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          totalSearches: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' },
          zeroResultSearches: { $sum: { $cond: [{ $eq: ['$resultCount', 0] }, 1, 0] } },
          totalResults: { $sum: '$resultCount' },
        },
      },
      {
        $project: {
          _id: 0,
          totalSearches: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          zeroResultSearches: 1,
          totalResults: 1,
        },
      },
    ]),
    SearchLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$normalizedQuery',
          query: { $first: '$query' },
          searches: { $sum: 1 },
          zeroResultSearches: { $sum: { $cond: [{ $eq: ['$resultCount', 0] }, 1, 0] } },
          lastSearchedAt: { $max: '$createdAt' },
        },
      },
      { $sort: { searches: -1, lastSearchedAt: -1 } },
      { $limit: safeLimit },
      {
        $project: {
          _id: 0,
          query: 1,
          searches: 1,
          zeroResultSearches: 1,
          lastSearchedAt: 1,
        },
      },
    ]),
    SearchLog.aggregate([
      { $match: { createdAt: { $gte: since }, resultCount: 0 } },
      {
        $group: {
          _id: '$normalizedQuery',
          query: { $first: '$query' },
          searches: { $sum: 1 },
          lastSearchedAt: { $max: '$createdAt' },
        },
      },
      { $sort: { searches: -1, lastSearchedAt: -1 } },
      { $limit: safeLimit },
      { $project: { _id: 0, query: 1, searches: 1, lastSearchedAt: 1 } },
    ]),
    SearchLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$mode', searches: { $sum: 1 } } },
      { $sort: { searches: -1 } },
      { $project: { _id: 0, mode: '$_id', searches: 1 } },
    ]),
    SearchLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { date: '$createdAt', format: '%Y-%m-%d' } },
          searches: { $sum: 1 },
          zeroResultSearches: { $sum: { $cond: [{ $eq: ['$resultCount', 0] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', searches: 1, zeroResultSearches: 1 } },
    ]),
  ]);

  const summaryData = summary[0] ?? {
    totalSearches: 0,
    uniqueUsers: 0,
    zeroResultSearches: 0,
    totalResults: 0,
  };
  const zeroRate = summaryData.totalSearches
    ? Number((summaryData.zeroResultSearches / summaryData.totalSearches).toFixed(4))
    : 0;

  return {
    windowDays: safeDays,
    summary: {
      totalSearches: summaryData.totalSearches,
      uniqueUsers: summaryData.uniqueUsers,
      zeroResultSearches: summaryData.zeroResultSearches,
      zeroResultRate: zeroRate,
      totalResultsReturned: summaryData.totalResults,
    },
    topQueries,
    zeroResultQueries,
    modeUsage,
    daily,
  };
}
