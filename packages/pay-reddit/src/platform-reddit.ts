import { Core, Interfaces, Services } from "@cryptology.hk/pay-framework";
import Snoowrap from "snoowrap";
import { Author, RedditConfig, RedditMessage } from "./interfaces";

const merchantsConfig = Core.config.get("merchants");

export class PlatformReddit {
    /**
     * @dev Prepare a Direct Message or Mention (parse it for commands)
     * @param item {RedditMessage}              An unread message/mention received from Reddit
     * @param sender {Interfaces.Username}      The sender of the message/poster of the comment with the mention
     * @param receiver {Interfaces.Username}    The receiver
     * @param arkPayUser {string}               The Reddit account that runs the bot.
     * @returns {Interfaces.Command[]}          An array with all parsed commands
     * @private
     */
    private static async prepareCommand(
        item: RedditMessage,
        sender: Interfaces.Username,
        receiver: Interfaces.Username,
        arkPayUser: string,
    ): Promise<Interfaces.Command[]> {
        try {
            // Do we have a mention or a direct message
            const platform: string = "reddit";
            if (item.hasOwnProperty("was_comment") && item.was_comment) {
                const id: string = item.name;
                const parentId: string = item.parent_id;
                const platform: string = "reddit";
                // Mention
                Core.logger.info(`Reddit Mention received: ${id} replying to ${parentId}`);
                const commands: Interfaces.Command[] = await Services.Parser.Parser.parseMention(
                    item.body,
                    arkPayUser,
                    platform,
                    sender,
                    receiver,
                    parentId,
                );
                if (commands === null) {
                    return [];
                }
                return commands;
            } else {
                // Direct Messenger
                Core.logger.info(`Reddit Direct Message received: ${item.id} : ${item.body}`);
                return await Services.Parser.Parser.parseDirectMessage(item.body, platform, sender);
            }
        } catch (e) {
            Core.logger.error(e.message);
        }
        return [];
    }

    /**
     * @dev Load Reddit settings from the configuration file
     * @returns {RedditConfig}  Configuration for Reddit
     * @private
     */
    private static loadConfig(): RedditConfig {
        const platforms: any = Core.config.get("platforms");
        if (!platforms || !platforms.hasOwnProperty("reddit")) {
            throw new Error("Did not find the configuration for Reddit.");
        }
        const redditConfiguration: any = platforms.reddit;
        const parsedConfig: RedditConfig = {
            admin: redditConfiguration.hasOwnProperty("admin") ? redditConfiguration.admin : null,
            userAgent: "ArkPay",
            clientId: redditConfiguration.hasOwnProperty("clientId") ? redditConfiguration.clientId : null,
            clientSecret: redditConfiguration.hasOwnProperty("clientSecret") ? redditConfiguration.clientSecret : null,
            username: redditConfiguration.hasOwnProperty("username") ? redditConfiguration.username : null,
            password: redditConfiguration.hasOwnProperty("password") ? redditConfiguration.password : null,
            requestDelay: 3000,
            continueAfterRatelimitError: true,
            networks: redditConfiguration.hasOwnProperty("networks") ? redditConfiguration.networks : ["ARK"],
        };

        if (
            !parsedConfig.admin ||
            !parsedConfig.clientId ||
            !parsedConfig.clientSecret ||
            !parsedConfig.username ||
            !parsedConfig.password
        ) {
            throw new Error("Bad Reddit configuration.");
        }
        return parsedConfig;
    }

    /**
     * @dev Reverse sort the unread messages/mentions received from Reddit so we will process the oldest message first.
     * @param unreadMessages
     * @returns {RedditMessage[]}   Array of filtered messages
     * @private
     */
    private static sortInbox(unreadMessages: RedditMessage[]): RedditMessage[] {
        const inbox: RedditMessage[] = [];

        for (const item in unreadMessages) {
            if (unreadMessages[item] && unreadMessages[item].author) {
                const message: RedditMessage = {
                    author: unreadMessages[item].author,
                    name: unreadMessages[item].name,
                    id: unreadMessages[item].id,
                    body: unreadMessages[item].body,
                    was_comment: unreadMessages[item].was_comment,
                };
                if (unreadMessages[item].hasOwnProperty("parent_id") && unreadMessages[item].parent_id) {
                    message.parent_id = unreadMessages[item].parent_id;
                }
                inbox.push(message);
            }
        }
        return inbox.reverse();
    }

    /**
     * @dev Check if a message/mention was not processed before
     * @param submissionId
     * @returns {Promise<boolean>} True if the message was not processed already
     * @private
     */
    private static async isNewSubmission(submissionId: string): Promise<boolean> {
        try {
            if (await Services.Storage.Storage.checkSubmission(submissionId)) {
                return false;
            }
            return await Services.Storage.Storage.addSubmission(submissionId);
        } catch (e) {
            // Most likely a DB connection error
            Core.logger.error(e.message);
        }
        return false;
    }

    /**
     * @dev Retrieve the username to be notified when a merchant transaction is processed
     * @param command
     * @returns {Interfaces.Username}  The username of the merchant that needs to be notified
     * @private
     */
    private static getMerchantUsername(command: string): Interfaces.Username {
        command = command.toLowerCase();

        if (!merchantsConfig.hasOwnProperty(command)) {
            throw TypeError(`Could not find merchant for ${command.toUpperCase()} in the configuration`);
        }

        if (!merchantsConfig[command].hasOwnProperty("notify")) {
            throw TypeError(`Could not find merchant notify for ${command.toUpperCase()} in the configuration`);
        }

        return merchantsConfig[command].notify;
    }

    /**
     * @dev The Snoowrap object (API to Reddit)
     */
    public readonly platformConfig: Snoowrap;

    private platform: Services.Platform;

    /**
     * @dev The configuration for the Snoowrap API
     */
    private readonly redditConfig: RedditConfig;

    /**
     * @dev Configure the Reddit API
     */
    constructor() {
        try {
            this.redditConfig = PlatformReddit.loadConfig();
            this.platformConfig = new Snoowrap({
                userAgent: this.redditConfig.userAgent,
                clientId: this.redditConfig.clientId,
                clientSecret: this.redditConfig.clientSecret,
                username: this.redditConfig.username,
                password: this.redditConfig.password,
            });

            const parameters: any = {
                requestDelay: this.redditConfig.requestDelay,
                continueAfterRatelimitError: this.redditConfig.continueAfterRatelimitError,
            };
            this.platformConfig.config(parameters);
            this.platform = new Services.Platform();
        } catch (e) {
            Core.logger.error(e.message);
        }
    }

    /**
     * @dev Poll Reddit and process all unread Direct Messages and Mentions
     */
    public async redditPolling() {
        try {
            const inbox: RedditMessage[] = await this.getUnreadMessages();
            for (const inboxIndex in inbox) {
                if (
                    typeof inbox[inboxIndex] !== "undefined" &&
                    inbox[inboxIndex].hasOwnProperty("author") &&
                    inbox[inboxIndex].author.hasOwnProperty("name")
                ) {
                    // Add was_comment property to a Direct Message, easier for parsing and executing later on.
                    if (!inbox[inboxIndex].hasOwnProperty("was_comment")) {
                        inbox[inboxIndex].was_comment = false;
                    }

                    // Check what we have
                    const commands: Interfaces.Command[] = await this.processInboxItem(inbox[inboxIndex]);

                    if (commands === null) {
                        // Nothing to do here, bad command, no connection to DB or it was processed already by an other server
                        Core.logger.warn("No commands parsed in message.");
                        return;
                    }

                    if (commands.length === 0 && inbox[inboxIndex].was_comment) {
                        // We received a mention without a command
                        // Reply to the comment with a "I was summoned but have no clue what you want from me" message
                        const reply: Interfaces.Reply = Services.Messenger.Messenger.summonedMessage();
                        Core.logger.info(`Sending Summoned Reply to comment: ${inbox[inboxIndex].id}`);
                        await this.postCommentReply(inbox[inboxIndex].id, reply.replyComment);
                    }

                    // Reply to them commands baby
                    for (const commandIndex in commands) {
                        if (commands[commandIndex]) {
                            try {
                                const command: Interfaces.Command = commands[commandIndex];

                                // check receiver
                                if (!(await this.checkReceiver(command))) {
                                    return;
                                }

                                // Execute the command
                                const reply: Interfaces.Reply = await Services.Commander.executeCommand(command);
                                const subject: string = `ArkPay: ${command.command}`;

                                // Reply to the Sender of the command
                                if (reply.hasOwnProperty("directMessageSender")) {
                                    Core.logger.info(
                                        `Sending Direct Message to sender: ${command.commandSender.username} on reddit`,
                                    );
                                    await this.sendDirectMessage(
                                        command.commandSender.username,
                                        reply.directMessageSender,
                                        subject,
                                    );
                                }

                                // Reply to the receiver of the command
                                if (reply.hasOwnProperty("directMessageReceiver")) {
                                    let receiver: Interfaces.Username = command.commandReplyTo;
                                    if (
                                        command.hasOwnProperty("transfer") &&
                                        command.transfer.hasOwnProperty("receiver")
                                    ) {
                                        receiver = command.transfer.receiver;
                                    }
                                    await this.platform.notifyReceiver(receiver, reply);
                                }

                                // Reply to a Merchant (that's you Justin)
                                if (reply.hasOwnProperty("directMessageMerchant")) {
                                    const merchant: Interfaces.Username = PlatformReddit.getMerchantUsername(
                                        command.command,
                                    );
                                    // todo check platform
                                    Core.logger.info(
                                        `Sending Direct Message to merchant: ${merchant.username} on ${merchant.platform}`,
                                    );
                                    await this.sendDirectMessage(
                                        merchant.username,
                                        reply.directMessageMerchant,
                                        subject,
                                    );
                                }

                                // Reply to a Post or Comment
                                if (reply.hasOwnProperty("replyComment") && inbox[inboxIndex].was_comment) {
                                    Core.logger.info(`Sending Reply to comment: ${inbox[inboxIndex].id} on reddit`);
                                    await this.postCommentReply(inbox[inboxIndex].id, reply.replyComment);
                                }
                            } catch (e) {
                                Core.logger.error(e.message);
                            }
                        }
                    }
                }
            }
        } catch (e) {
            Core.logger.warn(e.message);
        }
    }

    /**
     * @dev Check if a username is a valid user on Reddit
     * @param username {string}     The username to check
     * @returns {Promise<boolean>}  True if the username is valid on the platform
     */
    public async isValidUser(username: string): Promise<boolean> {
        try {
            // A username can't be a command
            if (Services.Commander.isValidCommand(username.toUpperCase())) {
                return false;
            }

            // A username can't be a currency
            if (Services.Currency.Currency.isValidCurrency(username.toUpperCase())) {
                return false;
            }

            const redditUser: any = await this.platformConfig.getUser(username).getTrophies();
            return redditUser && redditUser.hasOwnProperty("trophies");
        } catch (e) {
            Core.logger.error(e.message);
            return false;
        }
    }

    /**
     * @dev Send a Direct message on Reddit
     * @param to {string}       The receiving user
     * @param body {string}     The message body
     * @param subject {string}  The message subject
     * @returns {Promise<boolean>}  True if message was sent successfully
     */
    public async sendDirectMessage(to: string, body: string, subject: string): Promise<boolean> {
        return this.platformConfig
            .composeMessage({
                to,
                subject,
                text: body,
            })
            .then(() => {
                return true;
            })
            .catch(e => {
                Core.logger.error(e.message);
                return false;
            });
    }

    /**
     * @dev Post a comment reply on Reddit
     * @param submissionId {string} The ID of the comment to reply to
     * @param reply {string}        The text to reply
     * @returns {Promise<boolean>}  True id the comment was posted
     */
    public async postCommentReply(submissionId: string, reply: string): Promise<boolean> {
        try {
            // @ts-ignore
            const submission = await this.platformConfig.getComment(submissionId);
            await submission.reply(reply);
            return true;
        } catch (e) {
            Core.logger.error(e.message);
            return false;
        }
    }

    /**
     * @dev Send a notification to the admin that the Reddit listener has started
     * @returns {Promise<boolean>}  True if admin was notified
     */
    public async notifyAdmin(): Promise<boolean> {
        return this.platformConfig
            .composeMessage({
                to: this.redditConfig.admin,
                subject: "ARK Pay",
                text: `ARK Pay Reddit Listener started for ${this.redditConfig.username}`,
            })
            .then(() => {
                Core.logger.info(`ARK Pay Reddit listener START-notification sent to ${this.redditConfig.admin}`);
                return true;
            })
            .catch(e => {
                Core.logger.warn(e.message);
                return false;
            });
    }

    /**
     * @dev Check if a receiver is valid on a platform
     * @param command
     * @returns {Promise<boolean>}  True if receiver is valid on the platform
     * @private
     */
    private async checkReceiver(command: Interfaces.Command): Promise<boolean> {
        const checkReceiver: Interfaces.Username =
            command.hasOwnProperty("transfer") && command.transfer.hasOwnProperty("receiver")
                ? command.transfer.receiver
                : command.hasOwnProperty("commandReplyTo")
                ? command.commandReplyTo
                : null;

        // No receiver, so always good
        if (checkReceiver === null) {
            return true;
        }

        const receiverOk: boolean = await this.platform.isValidUser(checkReceiver);
        if (!receiverOk) {
            Core.logger.error(`Bad receiver: ${checkReceiver.username} on ${checkReceiver.platform}`);
        }
        return receiverOk;
    }

    /**
     * @dev  Process an item (message, mention) from the Bot's Inbox
     * @param {object} item The message or mention to process
     * @returns {Promise<Interfaces.Command[]>}    An array with Commands
     * @private
     */
    private async processInboxItem(item: RedditMessage): Promise<Interfaces.Command[]> {
        try {
            const needToProcessSubmission: boolean = await PlatformReddit.isNewSubmission(item.id);
            if (!needToProcessSubmission) {
                return null;
            }

            let receiver: Interfaces.Username = null;
            if (item.was_comment && item.parent_id) {
                // This is a Mention
                await this.markCommentRead(item.id);

                // Retrieve the author of the Reddit comment/post the user replied to
                const parentAuthor: Author = await this.getParentAuthor(item.parent_id);
                receiver = {
                    username: parentAuthor.name,
                    platform: "reddit",
                };
            } else {
                // This is a Direct Messenger
                await this.markMessageRead(item.id);
            }

            const sender: Interfaces.Username = {
                username: item.author.name,
                platform: "reddit",
            };

            return await PlatformReddit.prepareCommand(item, sender, receiver, this.redditConfig.username);
        } catch (e) {
            Core.logger.error(e.message);
            return null;
        }
    }

    /**
     * @dev Retreive the author of the post/commend the sender replied to
     * @param commentId {string}    The ID of the comment/post the sender replied to
     * @returns {Promise<Author>}   The author of the post/commend
     * @private
     */
    private async getParentAuthor(commentId: string): Promise<Author> {
        // @ts-ignore
        const parentAuthor: Author = await this.platformConfig.getComment(commentId).author;
        if (!parentAuthor || !parentAuthor.hasOwnProperty("name") || parentAuthor.name === "[deleted]") {
            throw new Error("Parent comment has been deleted.");
        }
        return parentAuthor;
    }

    /**
     * @dev Retrieve unread Direct Messages and Mentions from Reddit
     * @returns {Promise<RedditMessage[]>}  An array with unread Direct Messages and Mentions
     * @private
     */
    private async getUnreadMessages(): Promise<RedditMessage[]> {
        const options: any = {
            filter: "unread",
        };

        try {
            let unreadMessages: RedditMessage[] = await this.platformConfig.getInbox(options);
            unreadMessages = PlatformReddit.sortInbox(unreadMessages);
            return unreadMessages;
        } catch (e) {
            return [];
        }
    }

    /**
     * @dev Mark a comment as read
     * @param id
     * @private
     */
    private async markCommentRead(id: string): Promise<void> {
        try {
            // @ts-ignore
            const comment: any = await this.platformConfig.getComment(id);
            await this.platformConfig.markMessagesAsRead([comment]);
        } catch (e) {
            Core.logger.error(e.message);
        }
    }

    /**
     * @dev Mark a message as read
     * @param id
     * @private
     */
    private async markMessageRead(id: string): Promise<void> {
        try {
            // @ts-ignore
            const privateMessage: any = await this.platformConfig.getMessage(id);
            await privateMessage.markAsRead();
        } catch (e) {
            Core.logger.error(e.message);
        }
    }
}
