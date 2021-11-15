import React, {useEffect, useState} from "react";
import {genKeyPairAndSeed, SkynetClient, MySky, JsonData} from "skynet-js";
import {
  Routes,
  Route,
  Link,
  HashRouter,
  Navigate,
  useLocation,
} from "react-router-dom";
import {useNavigate} from "react-router-dom";

import "./App.css";
import ChatPage from "./ChatPage";
import MyskyProvider, {useMysky} from "./MyskyProvider";
import KeyProvider from "./KeyProvider";
import MessagesProvider from "./MessagesProvider";
import AuthedContainer from "./AuthedContainer";
import {addChat, Chat, getChats} from "./services/chatList";
import SkynetId from "./SkynetId";

// when launching, write my own public key

// when i go to a chat page, keep trying to fetch the other user's public key
// when i get it, calculate the shared key

// then read my chat file
// then read the other person's chat file

function HomePage() {
  const {mysky, userId, logout} = useMysky();
  const [newChatValue, setNewChatValue] = useState("");
  let navigate = useNavigate();

  // Write my keys if we can't find them
  useEffect(() => {
    console.log("my id", userId);
  }, [userId]);

  const [chats, setChats] = useState<null | Array<Chat>>(null);
  useEffect(() => {
    if (mysky == null) {
      return;
    }

    getChats(mysky).then((chats) => {
      setChats(chats);
    });
  }, [mysky]);

  return (
    <AuthedContainer
      onLogout={() => {
        if (logout == null) {
          throw new Error("Tried logging out before mysky was loaded");
        }
        logout();
      }}
    >
      {chats == null ? (
        <div>Loading...</div>
      ) : (
        <div>
          <h3>Open chats</h3>
          <ul>
            {chats.map((chat) => (
              <li style={{margin: "1em"}} key={chat.counterpartyId}>
                <Link
                  style={{textDecoration: "none"}}
                  to={`/chat/${chat.counterpartyId}`}
                >
                  <SkynetId id={chat.counterpartyId} />
                </Link>
              </li>
            ))}
          </ul>
          <h3>Start a new chat</h3>
          <label>
            Mysky id:{" "}
            <input
              style={{width: "600px"}}
              value={newChatValue}
              onChange={(e) => setNewChatValue(e.target.value)}
            />
          </label>
          <button
            onClick={() => {
              if (mysky == null) {
                console.error("Tried to start a chat before mysky was loaded");
                return;
              }
              addChat(mysky, newChatValue).then((chat) => {
                navigate(`/chat/${newChatValue}`);
              });
            }}
          >
            New Chat
          </button>
        </div>
      )}
    </AuthedContainer>
  );
}

function LoginPage() {
  let navigate = useNavigate();
  let location = useLocation();
  const {loginStatus, tryLogin} = useMysky();

  let from = location.state?.from?.pathname || "/";

  if (loginStatus === "unknown") {
    return <div>Loading...</div>;
  }
  if (loginStatus === "loggedIn") {
    return <Navigate to={from} />;
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <img
        style={{borderRadius: "40px"}}
        src="/android-chrome-192x192.png"
        alt="SkyChat logo"
      />
      <h1 style={{color: "#00a000"}}>SkyChat</h1>
      <button
        onClick={() => {
          if (tryLogin == null) {
            throw new Error("Tried logging in before mysky was loaded");
          }
          tryLogin().then((loggedIn) => {
            if (loggedIn) {
              navigate(from, {replace: true});
            }
          });
        }}
      >
        Login with MySky
      </button>
    </div>
  );
}

function RequireAuth({children}: {children: JSX.Element}) {
  let {mysky, loginStatus} = useMysky();
  let location = useLocation();

  if (mysky == null || loginStatus === "unknown") {
    return <div>Loading...</div>;
  }

  if (loginStatus === "loggedOut") {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{from: location}} />;
  }

  return children;
}

function App() {
  return (
    <MyskyProvider>
      <KeyProvider>
        <MessagesProvider>
          <HashRouter>
            <Routes>
              <Route
                path="/"
                element={
                  <RequireAuth>
                    <HomePage />
                  </RequireAuth>
                }
              />
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/chat/:counterpartyId"
                element={
                  <RequireAuth>
                    <ChatPage />
                  </RequireAuth>
                }
              />
            </Routes>
          </HashRouter>
        </MessagesProvider>
      </KeyProvider>
    </MyskyProvider>
  );
}

export default App;
