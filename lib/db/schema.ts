import { boolean, integer, jsonb, pgTable, real, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { GameSaveState } from '@/lib/game/types'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

export const gameSaves = pgTable('eko_game_saves', {
  userId: text('userId').primaryKey(),
  playerState: jsonb('playerState').$type<GameSaveState>().notNull(),
  positionX: real('positionX').notNull().default(-6),
  positionZ: real('positionZ').notNull().default(4),
  gameMinutes: integer('gameMinutes').notNull().default(1302),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
})

export const playerPresence = pgTable('eko_player_presence', {
  userId: text('userId').primaryKey(),
  roomId: text('roomId').notNull().default('eko-mainland'),
  displayName: text('displayName').notNull(),
  x: real('x').notNull().default(-6),
  z: real('z').notNull().default(4),
  inVehicle: boolean('inVehicle').notNull().default(false),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
})

export const roomMessages = pgTable('eko_room_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('userId').notNull(),
  roomId: text('roomId').notNull().default('eko-mainland'),
  displayName: text('displayName').notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
})
