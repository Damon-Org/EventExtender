import BaseModule from './structures/BaseModule.js'

export default class EventExtender extends BaseModule {
    _voiceChannels = new Map();

    /**
     * @param {Main} main
     */
    constructor(main) {
        super(main);

        this.register(EventExtender, {
            name: 'eventExtender'
        });

        this._eventReferences = {};
    }

    cleanup() {
        for (const prop in this._eventReferences)
            if (this._eventReferences.hasOwnProperty(prop))
                this._m.off(prop, this._eventReferences[prop]);
    }

    init() {
        this._m.on('messageReactionAdd', this._eventReferences['add'] = (messageReaction, user) => this._reactionEvent('add', messageReaction, user));
        this._m.on('messageReactionRemove', this._eventReferences['remove'] = (messageReaction, user) => this._reactionEvent('remove', messageReaction, user));

        this._m.on('voiceStateUpdate', this._eventReferences['voiceState'] = (oldState, newState) => this._voiceStateEvent(oldState, newState));

        return true;
    }

    /**
     * This method will extend the messageReaction events and emit additional listeners add/remove/toggle
     * @private
     * @param {string} type The reaction event type "add" or "remove"
     * @param {MessageReaction} messageReaction
     * @param {User} user The user that initiated the reaction event
     */
    _reactionEvent(type, messageReaction, user) {
        this._m.emit('reactionToggle', messageReaction, user);

        switch (type) {
            case 'add': {
                this._m.emit('reactionAdd', messageReaction, user);
                break;
            }
            case 'remove': {
                this._m.emit('reactionRemove', messageReaction, user);
                break;
            }
        }
    }

    _voiceStateEvent(oldState, newState) {
        const
            guild = oldState.member.guild || newState.member.guild,
            serverMember = oldState.member || newState.member,
            voiceChannel = oldState.channel || newState.channel;

        if (!guild || !serverMember || !voiceChannel) return;

        this._m.emit('voiceUpdate', guild, serverMember, voiceChannel);

        if (!this._voiceChannels.has(voiceChannel.id)) this._voiceChannels.set(voiceChannel.id, 0);
        const vcPreviousSize = this._voiceChannels.get(voiceChannel.id);

        if (!oldState || vcPreviousSize < voiceChannel.members.size) {
            this._voiceChannels.set(voiceChannel.id, voiceChannel.members.size);

            this._m.emit('voiceJoin', guild, serverMember, voiceChannel);
        }
        else if (vcPreviousSize > voiceChannel.members.size) {
            this._voiceChannels.set(voiceChannel.id, voiceChannel.members.size);

            this._m.emit('voiceLeave', guild, serverMember, voiceChannel);
        }

        if (voiceChannel.members.size == 0) {
            this._voiceChannels.delete(voiceChannel.id);
        }
    }
}
