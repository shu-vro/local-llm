import { NativeSQLite } from "@/native/sqlite";

import { AttachmentsRepo, createAttachmentsRepo } from "./attachmentsRepo";
import { createMessagesRepo, MessagesRepo } from "./messagesRepo";
import { createModelStateRepo, ModelStateRepo } from "./modelStateRepo";
import { createSettingsRepo, SettingsRepo } from "./settingsRepo";
import { createThreadsRepo, ThreadsRepo } from "./threadsRepo";

export interface Repositories {
  threads: ThreadsRepo;
  messages: MessagesRepo;
  attachments: AttachmentsRepo;
  settings: SettingsRepo;
  modelState: ModelStateRepo;
}

export function createRepositories(db: NativeSQLite): Repositories {
  return {
    threads: createThreadsRepo(db),
    messages: createMessagesRepo(db),
    attachments: createAttachmentsRepo(db),
    settings: createSettingsRepo(db),
    modelState: createModelStateRepo(db),
  };
}

export * from "./attachmentsRepo";
export * from "./messagesRepo";
export * from "./modelStateRepo";
export * from "./settingsRepo";
export * from "./threadsRepo";
export type {
  AttachmentsRepo,
  MessagesRepo,
  ModelStateRepo,
  SettingsRepo,
  ThreadsRepo,
};
