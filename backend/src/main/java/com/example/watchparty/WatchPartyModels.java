package com.example.watchparty;

import java.util.*;

class Room {
    private String roomId;
    private String videoId = "dQw4w9WgXcQ";
    private String playState = "PAUSED";
    private double currentTime = 0;
    private Map<String, Participant> participants = new LinkedHashMap<>();

    public Room(String roomId) { this.roomId = roomId; }
    public String getRoomId() { return roomId; }
    public String getVideoId() { return videoId; }
    public void setVideoId(String videoId) { this.videoId = videoId; }
    public String getPlayState() { return playState; }
    public void setPlayState(String playState) { this.playState = playState; }
    public double getCurrentTime() { return currentTime; }
    public void setCurrentTime(double currentTime) { this.currentTime = currentTime; }
    public Map<String, Participant> getParticipants() { return participants; }
}

class Participant {
    private String userId;
    private String username;
    private String role;

    public Participant() {}
    public Participant(String userId, String username, String role) {
        this.userId = userId;
        this.username = username;
        this.role = role;
    }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}

class ClientEvent {
    private String roomId;
    private String userId;
    private String username;
    private String role;
    private String videoId;
    private Double time;
    private String message;

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getVideoId() { return videoId; }
    public void setVideoId(String videoId) { this.videoId = videoId; }
    public Double getTime() { return time; }
    public void setTime(Double time) { this.time = time; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}

class ServerEvent {
    private String type;
    private String roomId;
    private String userId;
    private String username;
    private String role;
    private String videoId;
    private String playState;
    private double currentTime;
    private String message;
    private Collection<Participant> participants;

    public ServerEvent(String type) { this.type = type; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getVideoId() { return videoId; }
    public void setVideoId(String videoId) { this.videoId = videoId; }
    public String getPlayState() { return playState; }
    public void setPlayState(String playState) { this.playState = playState; }
    public double getCurrentTime() { return currentTime; }
    public void setCurrentTime(double currentTime) { this.currentTime = currentTime; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Collection<Participant> getParticipants() { return participants; }
    public void setParticipants(Collection<Participant> participants) { this.participants = participants; }
}
