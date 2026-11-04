import { Types } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

function notFound(message: string) {
  return Object.assign(new Error(message), { status: 404 });
}

function normalizeObjectIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((member) => String(member).trim())
    .filter(Boolean)
    .filter((member) => Types.ObjectId.isValid(member));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toActivityFocus(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes('strength')) return 'strength';
  if (normalized.includes('run') || normalized.includes('cycle') || normalized.includes('walk')) return 'endurance';
  return 'endurance';
}

export async function listActivities() {
  return Activity.find().sort({ occurredAt: -1 }).lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw badRequest('Activity payload is required');
  }

  const body = input as Record<string, unknown>;
  const userId = String(body.userId ?? '').trim();
  const teamId = String(body.teamId ?? '').trim();
  const type = String(body.type ?? '').trim();
  const minutesValue = Number(body.minutes);

  if (!Types.ObjectId.isValid(userId)) {
    throw badRequest('A valid userId is required');
  }
  if (!Types.ObjectId.isValid(teamId)) {
    throw badRequest('A valid teamId is required');
  }
  if (!type || !Number.isFinite(minutesValue) || minutesValue <= 0) {
    throw badRequest('A valid activity type and minutes are required');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw notFound('User not found');
  }

  const team = await Team.findById(teamId);
  if (!team) {
    throw notFound('Team not found');
  }

  const points = Math.max(Math.round(minutesValue * (type.toLowerCase().includes('strength') ? 1.2 : type.toLowerCase().includes('cycle') ? 1.1 : 1.25)), 1);

  const activity = await Activity.create({
    user: userId,
    team: teamId,
    type,
    minutes: minutesValue,
    points,
    occurredAt: new Date(),
  });

  return activity.toObject();
}

export async function listTeams() {
  return Team.find().sort({ name: 1 }).lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object') {
    throw badRequest('Team payload is required');
  }

  const body = input as Record<string, unknown>;
  const name = String(body.name ?? '').trim();
  const mascot = String(body.mascot ?? '').trim();
  const members = normalizeObjectIdList(body.members);

  if (!name) {
    throw badRequest('Team name is required');
  }
  if (!mascot) {
    throw badRequest('Team mascot is required');
  }

  const team = await Team.create({
    name,
    mascot,
    members,
  });

  return team.toObject();
}

export async function getLeaderboard() {
  const leaderboard = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $lookup: { from: 'teams', localField: '_id', foreignField: '_id', as: 'teamDetails' } },
    { $unwind: '$teamDetails' },
    { $project: { teamName: '$teamDetails.name', totalPoints: 1 } },
    { $sort: { totalPoints: -1, teamName: 1 } },
  ]);

  return leaderboard.map((entry, index) => ({
    teamName: entry.teamName,
    totalPoints: entry.totalPoints,
    rank: index + 1,
  }));
}

export async function suggestWorkouts(userEmail: string) {
  const email = decodeURIComponent(String(userEmail ?? '')).trim();

  if (!email) {
    throw badRequest('A user email is required');
  }

  const user = await User.findOne({ email: { $regex: new RegExp(`^${escapeRegExp(email)}$`, 'i') } }).lean();
  if (!user) {
    throw notFound('User not found');
  }

  const recentActivity = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).lean();
  const preferredType = recentActivity[0]?.type ?? user.fitnessGoal ?? 'endurance';
  const preferredFocus = toActivityFocus(preferredType);

  const candidates = await Workout.find({
    focus: { $regex: new RegExp(`^${escapeRegExp(preferredFocus)}$`, 'i') },
  }).sort({ minutes: 1 }).lean();

  const fallback = candidates.length > 0 ? candidates : await Workout.find().sort({ minutes: 1 }).lean();
  if (fallback.length === 0) {
    return [];
  }

  const reason = recentActivity[0]
    ? `Based on your recent ${recentActivity[0].type} activity, this ${preferredFocus} workout matches your effort.`
    : `Based on your ${user.fitnessGoal ?? preferredFocus} goal, this ${preferredFocus} workout fits your plan.`;

  return fallback.slice(0, 3).map((workout) => ({
    ...workout,
    reason,
  }));
}

export { User };
