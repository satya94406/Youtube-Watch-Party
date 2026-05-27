package com.example.watchparty;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Controller
public class WatchPartyController {
    private final SimpMessagingTemplate messagingTemplate;
    private final Map<String, Room> rooms = new ConcurrentHashMap<>();

    public WatchPartyController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/join_room")
    public void joinRoom(ClientEvent event) {
        Room room = rooms.computeIfAbsent(event.getRoomId(), Room::new);
        String userId = event.getUserId() == null || event.getUserId().isBlank()
                ? UUID.randomUUID().toString()
                : event.getUserId();

        String role = room.getParticipants().isEmpty() ? "HOST" : "PARTICIPANT";
        Participant participant = new Participant(userId, event.getUsername(), role);
        room.getParticipants().put(userId, participant);

        ServerEvent joined = base("user_joined", room);
        joined.setUserId(userId);
        joined.setUsername(event.getUsername());
        joined.setRole(role);
        broadcast(room.getRoomId(), joined);

        ServerEvent sync = base("sync_state", room);
        broadcast(room.getRoomId(), sync);
    }

    @MessageMapping("/leave_room")
    public void leaveRoom(ClientEvent event) {
        Room room = rooms.get(event.getRoomId());
        if (room == null) return;
        Participant removed = room.getParticipants().remove(event.getUserId());
        if (removed == null) return;

        ServerEvent left = base("user_left", room);
        left.setUserId(removed.getUserId());
        left.setUsername(removed.getUsername());
        broadcast(room.getRoomId(), left);
    }

    @MessageMapping("/play")
    public void play(ClientEvent event) {
        Room room = getAllowedRoom(event);
        if (room == null) return;
        room.setPlayState("PLAYING");
        room.setCurrentTime(event.getTime() == null ? room.getCurrentTime() : event.getTime());
        broadcast(room.getRoomId(), base("sync_state", room));
    }

    @MessageMapping("/pause")
    public void pause(ClientEvent event) {
        Room room = getAllowedRoom(event);
        if (room == null) return;
        room.setPlayState("PAUSED");
        room.setCurrentTime(event.getTime() == null ? room.getCurrentTime() : event.getTime());
        broadcast(room.getRoomId(), base("sync_state", room));
    }

    @MessageMapping("/seek")
    public void seek(ClientEvent event) {
        Room room = getAllowedRoom(event);
        if (room == null) return;
        room.setCurrentTime(event.getTime() == null ? 0 : event.getTime());
        broadcast(room.getRoomId(), base("sync_state", room));
    }

    @MessageMapping("/change_video")
    public void changeVideo(ClientEvent event) {
        Room room = getAllowedRoom(event);
        if (room == null) return;
        room.setVideoId(event.getVideoId());
        room.setCurrentTime(0);
        room.setPlayState("PAUSED");
        broadcast(room.getRoomId(), base("sync_state", room));
    }

    @MessageMapping("/assign_role")
    public void assignRole(ClientEvent event) {
        Room room = rooms.get(event.getRoomId());
        if (room == null || !isHost(room, event.getUsername())) return;
        Participant participant = room.getParticipants().get(event.getUserId());
        if (participant == null) return;
        participant.setRole(event.getRole());

        ServerEvent roleAssigned = base("role_assigned", room);
        roleAssigned.setUserId(participant.getUserId());
        roleAssigned.setUsername(participant.getUsername());
        roleAssigned.setRole(participant.getRole());
        broadcast(room.getRoomId(), roleAssigned);
    }

    @MessageMapping("/remove_participant")
    public void removeParticipant(ClientEvent event) {
        Room room = rooms.get(event.getRoomId());
        if (room == null || !isHost(room, event.getUsername())) return;
        Participant participant = room.getParticipants().remove(event.getUserId());
        if (participant == null) return;

        ServerEvent removed = base("participant_removed", room);
        removed.setUserId(participant.getUserId());
        removed.setUsername(participant.getUsername());
        broadcast(room.getRoomId(), removed);
    }

    @MessageMapping("/chat")
    public void chat(ClientEvent event) {
        Room room = rooms.get(event.getRoomId());
        if (room == null) return;
        ServerEvent chat = base("chat", room);
        chat.setUsername(event.getUsername());
        chat.setMessage(event.getMessage());
        broadcast(room.getRoomId(), chat);
    }

    private Room getAllowedRoom(ClientEvent event) {
        Room room = rooms.get(event.getRoomId());
        if (room == null) return null;
        Participant participant = room.getParticipants().values().stream()
                .filter(p -> Objects.equals(p.getUsername(), event.getUsername()))
                .findFirst()
                .orElse(null);
        if (participant == null) return null;
        if (participant.getRole().equals("HOST") || participant.getRole().equals("MODERATOR")) return room;
        return null;
    }

    private boolean isHost(Room room, String username) {
        return room.getParticipants().values().stream()
                .anyMatch(p -> Objects.equals(p.getUsername(), username) && p.getRole().equals("HOST"));
    }

    private ServerEvent base(String type, Room room) {
        ServerEvent event = new ServerEvent(type);
        event.setRoomId(room.getRoomId());
        event.setVideoId(room.getVideoId());
        event.setPlayState(room.getPlayState());
        event.setCurrentTime(room.getCurrentTime());
        event.setParticipants(room.getParticipants().values());
        return event;
    }

    private void broadcast(String roomId, ServerEvent event) {
        messagingTemplate.convertAndSend("/topic/room/" + roomId, event);
    }
}
