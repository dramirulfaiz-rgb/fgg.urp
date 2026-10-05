import { integer, sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
export const proposals=sqliteTable('proposals',{
 id:integer('id').primaryKey({autoIncrement:true}), code:text('code').notNull().unique(), keyHash:text('key_hash').notNull(), data:text('data').notNull(), snapshot:text('snapshot'), version:integer('version').notNull().default(1), status:text('status').notNull().default('Draft'), feedback:text('feedback').notNull().default(''), createdAt:text('created_at').notNull(), updatedAt:text('updated_at').notNull(), submittedAt:text('submitted_at'), titleSubmittedAt:text('title_submitted_at')
});
export const sessions=sqliteTable('sessions',{tokenHash:text('token_hash').primaryKey(),role:text('role').notNull(),proposalId:integer('proposal_id'),expires:integer('expires').notNull()});
export const limits=sqliteTable('limits',{id:text('id').primaryKey(),hits:integer('hits').notNull()});

export const assets=sqliteTable('assets',{id:text('id').primaryKey(),proposalId:integer('proposal_id').notNull(),objectKey:text('object_key').notNull(),mime:text('mime').notNull(),size:integer('size').notNull(),createdAt:text('created_at').notNull()},t=>[index('assets_proposal_id_idx').on(t.proposalId)]);

export const mailSettings=sqliteTable('mail_settings',{id:integer('id').primaryKey(),url:text('url').notNull().default(''),encryptedSecret:text('encrypted_secret').notNull(),updatedAt:text('updated_at').notNull()});
export const mailOutbox=sqliteTable('mail_outbox',{id:text('id').primaryKey(),proposalId:integer('proposal_id').notNull(),kind:text('kind').notNull(),recipient:text('recipient').notNull(),subject:text('subject').notNull(),body:text('body').notNull(),status:text('status').notNull().default('queued'),attempts:integer('attempts').notNull().default(0),lastError:text('last_error').notNull().default(''),createdAt:text('created_at').notNull(),sentAt:text('sent_at')},t=>[index('mail_proposal_idx').on(t.proposalId)]);
