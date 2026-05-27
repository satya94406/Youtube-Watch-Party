import { useEffect, useRef, useState } from "react";
import YouTube from "react-youtube";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

function WatchParty() {
  const [roomId, setRoomId] = useState("ROOM123");
  const [username, setUsername] = useState("Satya");
  const [joined, setJoined] = useState(false);
  const [myRole, setMyRole] = useState("PARTICIPANT");

  const [participants, setParticipants] = useState([]);

  const [videoUrl, setVideoUrl] = useState("");
  const [videoId, setVideoId] = useState("dQw4w9WgXcQ");

  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([]);

  const [status, setStatus] = useState("Disconnected");

  const stompRef = useRef(null);
  const subscriptionRef = useRef(null);
  const playerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const userIdRef = useRef(crypto.randomUUID());

  const applyingRemote = useRef(false);
  const lastVideoIdRef = useRef("dQw4w9WgXcQ");

  const canControl =
    myRole === "HOST" ||
    myRole === "MODERATOR";

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () =>
      new SockJS("https://youtube-watch-party-kqni.onrender.com/ws"),

      reconnectDelay: 3000,

      onConnect: () => {
        setStatus("Connected");
      },

      onDisconnect: () => {
        setStatus("Disconnected");
      },

      onStompError: () => {
        setStatus("WebSocket Error");
      },
    });

    client.activate();

    stompRef.current = client;

    return () => client.deactivate();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const send = (destination, body) => {
    if (!stompRef.current?.connected) {
      alert(
        "WebSocket not connected. Start backend first."
      );
      return;
    }

    stompRef.current.publish({
      destination,
      body: JSON.stringify(body),
    });
  };

  const subscribeRoom = () => {
    if (!stompRef.current?.connected) {
      alert(
        "Backend not connected. Start Spring Boot first."
      );
      return;
    }

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    subscriptionRef.current =
      stompRef.current.subscribe(
        `/topic/room/${roomId}`,
        (msg) => {
          const event = JSON.parse(msg.body);
          handleServerEvent(event);
        }
      );

    send("/app/join_room", {
      roomId,
      username,
      userId: userIdRef.current,
    });

    setJoined(true);
  };

  const handleServerEvent = (event) => {
    if (event.participants) {
      const list = [...event.participants];

      setParticipants(list);

      const me = list.find(
        (p) => p.userId === userIdRef.current
      );

      if (me) setMyRole(me.role);
    }

    if (event.type === "sync_state")
      applySync(event);

    if (event.type === "chat") {
      setMessages((old) => [...old, event]);
    }

    if (event.type === "user_joined") {
      setMessages((old) => [
        ...old,
        {
          username: "System",
          message: `${event.username} joined as ${event.role}`,
        },
      ]);
    }

    if (event.type === "user_left") {
      setMessages((old) => [
        ...old,
        {
          username: "System",
          message: `${event.username} left`,
        },
      ]);
    }

    if (event.type === "role_assigned") {
      setMessages((old) => [
        ...old,
        {
          username: "System",
          message: `${event.username} is now ${event.role}`,
        },
      ]);
    }

    if (event.type === "participant_removed") {
      if (
        event.userId === userIdRef.current
      ) {
        alert("You were removed by host");

        setJoined(false);
        setParticipants([]);
        setMessages([]);
        setMyRole("PARTICIPANT");
      }
    }
  };

  const applySync = (event) => {
    if (!playerRef.current) {
      setVideoId(event.videoId);

      lastVideoIdRef.current =
        event.videoId;

      return;
    }

    applyingRemote.current = true;

    const incomingVideoId =
      event.videoId || videoId;

    const time = Number(
      event.currentTime || 0
    );

    const sameVideo =
      lastVideoIdRef.current ===
      incomingVideoId;

    if (!sameVideo) {
      setVideoId(incomingVideoId);

      lastVideoIdRef.current =
        incomingVideoId;

      playerRef.current.cueVideoById(
        incomingVideoId,
        time
      );
    } else {
      playerRef.current.seekTo(time, true);
    }

    setTimeout(() => {
      if (
        event.playState === "PLAYING"
      ) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }

      setTimeout(() => {
        applyingRemote.current = false;
      }, 500);
    }, 300);
  };

  const extractVideoId = (input) => {
    if (!input) return "";

    const regex =
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&?/]+)/;

    const match = input.match(regex);

    return match ? match[1] : input;
  };

  const sendControl = (
    destination,
    extra = {}
  ) => {
    if (!canControl) {
      alert(
        "Only HOST or MODERATOR can control video"
      );
      return;
    }

    send(destination, {
      roomId,
      username,
      userId: userIdRef.current,
      time:
        playerRef.current?.getCurrentTime() ||
        0,
      ...extra,
    });
  };

  const changeVideo = () => {
    const id = extractVideoId(
      videoUrl.trim()
    );

    if (!id) {
      alert(
        "Paste YouTube URL or video ID"
      );
      return;
    }

    setVideoId(id);

    lastVideoIdRef.current = id;

    sendControl("/app/change_video", {
      videoId: id,
      time: 0,
    });
  };

  const assignRole = (
    targetUserId,
    newRole
  ) => {
    if (myRole !== "HOST") {
      alert("Only HOST can assign roles");
      return;
    }

    send("/app/assign_role", {
      roomId,
      username,
      userId: targetUserId,
      role: newRole,
    });
  };

  const removeParticipant = (
    targetUserId
  ) => {
    if (myRole !== "HOST") {
      alert(
        "Only HOST can remove participants"
      );
      return;
    }

    send("/app/remove_participant", {
      roomId,
      username,
      userId: targetUserId,
    });
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;

    send("/app/chat", {
      roomId,
      username,
      message: chatInput,
    });

    setChatInput("");
  };

  const leaveRoom = () => {
    send("/app/leave_room", {
      roomId,
      username,
      userId: userIdRef.current,
    });

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    setJoined(false);

    setParticipants([]);
    setMessages([]);

    setMyRole("PARTICIPANT");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">

      <div className="max-w-7xl mx-auto">

        <div className="mb-6 text-center">

          <h1 className="text-3xl md:text-5xl font-black">
            YouTube Watch Party
          </h1>

          <p className="text-slate-400 mt-2">
            Realtime room, roles, sync playback,
            participants and chat
          </p>

          <p className="text-sm mt-2">
            WebSocket:
            <span className="text-emerald-400 ml-2">
              {status}
            </span>
          </p>

        </div>

        {!joined ? (

          <div className="max-w-xl mx-auto bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-800">

            <h2 className="text-2xl font-bold mb-4">
              Create / Join Room
            </h2>

            <input
              className="w-full h-14 px-4 rounded-xl bg-slate-800 text-white placeholder-slate-400 outline-none border border-slate-700 mb-4"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              placeholder="Your name"
            />

            <input
              className="w-full h-14 px-4 rounded-xl bg-slate-800 text-white placeholder-slate-400 outline-none border border-slate-700 mb-4"
              value={roomId}
              onChange={(e) =>
                setRoomId(e.target.value)
              }
              placeholder="Room code"
            />

            <button
              onClick={subscribeRoom}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold"
            >
              Join Room
            </button>

          </div>

        ) : (

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">

            {/* LEFT */}
            <div className="lg:col-span-3 bg-slate-900 rounded-2xl p-5 shadow-xl border border-slate-800 self-start">

              {/* VIDEO INPUT */}
              <div className="flex items-stretch gap-3 mb-4">

                <input
                  value={videoUrl}
                  onChange={(e) =>
                    setVideoUrl(e.target.value)
                  }
                  placeholder="Paste YouTube URL or video ID"
                  className="w-0 flex-1 h-14 px-4 rounded-xl bg-slate-800 text-white placeholder-slate-400 outline-none border border-slate-700"
                />

                <button
                  onClick={changeVideo}
                  className="h-14 w-[150px] bg-red-600 hover:bg-red-700 rounded-xl font-bold flex items-center justify-center shrink-0"
                >
                  Change Video
                </button>

              </div>

              {/* PLAYER */}
              <div className="rounded-xl overflow-hidden bg-black">

                <YouTube
                  videoId={videoId}
                  opts={{
                    width: "100%",
                    height: "440",
                    playerVars: {
                      autoplay: 0,
                      controls: 1,
                    },
                  }}
                  onReady={(e) =>
                    (playerRef.current = e.target)
                  }
                  onPlay={() => {
                    if (
                      !applyingRemote.current
                    ) {
                      sendControl("/app/play");
                    }
                  }}
                  onPause={() => {
                    if (
                      !applyingRemote.current
                    ) {
                      sendControl("/app/pause");
                    }
                  }}
                />

              </div>

              {/* CONTROLS */}
              <div className="flex flex-wrap gap-3 mt-5">

                <button
                  onClick={() =>
                    sendControl("/app/play")
                  }
                  className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-xl font-bold"
                >
                  Play
                </button>

                <button
                  onClick={() =>
                    sendControl("/app/pause")
                  }
                  className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-xl font-bold"
                >
                  Pause
                </button>

                <button
                  onClick={() =>
                    sendControl("/app/seek", {
                      time:
                        playerRef.current?.getCurrentTime() ||
                        0,
                    })
                  }
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-bold"
                >
                  Sync Seek
                </button>

                <button
                  onClick={leaveRoom}
                  className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-xl font-bold"
                >
                  Leave
                </button>

                <span className="px-4 py-3 rounded-xl bg-slate-800">
                  Room: {roomId}
                </span>

                <span className="px-4 py-3 rounded-xl bg-slate-800">
                  Your Role: {myRole}
                </span>

              </div>

            </div>

            {/* RIGHT */}
            <div className="space-y-6 self-start">

              {/* PARTICIPANTS */}
              <div className="bg-slate-900 rounded-2xl p-5 shadow-xl border border-slate-800">

                <h2 className="text-xl font-bold mb-4">
                  Participants
                </h2>

                <div
                  className="space-y-3 max-h-[240px] overflow-y-scroll pr-2
                  [&::-webkit-scrollbar]:w-2
                  [&::-webkit-scrollbar-track]:bg-slate-700
                  [&::-webkit-scrollbar-thumb]:bg-blue-500
                  [&::-webkit-scrollbar-thumb]:rounded-full"
                >

                  {participants.map((p) => (

                    <div
                      key={p.userId}
                      className="bg-slate-800 rounded-xl p-3"
                    >

                      <div className="font-semibold break-words">
                        {p.username}
                      </div>

                      <div className="text-sm text-blue-300 mb-2">
                        {p.role}
                      </div>

                      {myRole === "HOST" &&
                        p.userId !==
                          userIdRef.current &&
                        p.role !== "HOST" && (

                          <div className="flex flex-wrap gap-2 mt-2">

                            <button
                              onClick={() =>
                                assignRole(
                                  p.userId,
                                  "MODERATOR"
                                )
                              }
                              className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-xs font-bold"
                            >
                              Mod
                            </button>

                            <button
                              onClick={() =>
                                assignRole(
                                  p.userId,
                                  "PARTICIPANT"
                                )
                              }
                              className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold"
                            >
                              User
                            </button>

                            <button
                              onClick={() =>
                                removeParticipant(
                                  p.userId
                                )
                              }
                              className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-bold"
                            >
                              Remove
                            </button>

                          </div>

                        )}

                    </div>

                  ))}

                </div>

              </div>

              {/* CHAT */}
              <div className="bg-slate-900 rounded-2xl p-5 shadow-xl border border-slate-800">

                <h2 className="text-xl font-bold mb-4">
                  Chat
                </h2>

                <div className="h-[300px] overflow-y-auto bg-slate-800 rounded-xl p-3 mb-3">

                  {messages.map((m, i) => (

                    <div
                      key={i}
                      className="mb-2 text-sm break-words"
                    >

                      <span className="font-bold text-cyan-300">
                        {m.username}:
                      </span>

                      <span className="ml-2">
                        {m.message}
                      </span>

                    </div>

                  ))}

                  <div ref={messagesEndRef} />

                </div>

                {/* CHAT INPUT */}
                <div className="w-full overflow-hidden">

                  <div className="flex w-full gap-2">

                    <input
                      value={chatInput}
                      onChange={(e) =>
                        setChatInput(
                          e.target.value
                        )
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        sendChat()
                      }
                      placeholder="Message"
                      className="w-0 flex-1 h-14 px-4 rounded-xl bg-slate-800 text-white placeholder-slate-400 outline-none border border-slate-700"
                    />

                    <button
                      onClick={sendChat}
                      className="h-14 w-[90px] bg-blue-600 hover:bg-blue-700 rounded-xl font-bold flex items-center justify-center shrink-0"
                    >
                      Send
                    </button>

                  </div>

                </div>

              </div>

            </div>

          </div>

        )}

      </div>

    </div>
  );
}

export default WatchParty;