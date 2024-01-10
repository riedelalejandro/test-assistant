// src/components/Chat.tsx
import React, { useEffect, useState } from "react";
import { TextField, Button, Container, Grid, LinearProgress, Alert } from "@mui/material";
import Message from "./Message";
import OpenAI from "openai";
import { MessageDto } from "../models/MessageDto";

const Chat: React.FC = () => {
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [messages, setMessages] = useState<Array<MessageDto>>(new Array<MessageDto>());
  const [input, setInput] = useState<string>("");
  const [assistant, setAssistant] = useState<any>(null);
  const [thread, setThread] = useState<any>(null);
  const [openai, setOpenai] = useState<any>(null);
  const [apiKey, setApiKey] = useState<any>('');
  const [assistantId, setAssistantId] = useState<any>('');
  const [error, setError] = useState<any>(null);

  const handleInit = () => {
    initChatBot();
  };

  useEffect(() => {
    setMessages([
      {
        content: "Hi, I'm your personal assistant. How can I help you?",
        isUser: false,
      },
    ]);
  }, [assistant]);

  const initChatBot = async () => {
    const openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
    });

    let assistant;
    try {
      setError(null);
      assistant = await openai.beta.assistants.retrieve(
        assistantId
      );
      // Create a thread
      const thread = await openai.beta.threads.create();

      setOpenai(openai);
      setAssistant(assistant);
      setThread(thread);
    } catch(e) {
      console.error(e);
      setError('Invalid credentials');
    }    
  };

  const createNewMessage = (content: string, isUser: boolean) => {
    const newMessage = new MessageDto(isUser, content);
    return newMessage;
  };

  const handleSendMessage = async () => {
    messages.push(createNewMessage(input, true));
    setMessages([...messages]);
    setInput("");

    // Send a message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: input,
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
    });

    // Create a response
    let response = await openai.beta.threads.runs.retrieve(thread.id, run.id);

    // Wait for the response to be ready
    while (response.status === "in_progress" || response.status === "queued") {
      console.log("waiting...");
      setIsWaiting(true);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      response = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    setIsWaiting(false);

    // Get the messages for the thread
    const messageList = await openai.beta.threads.messages.list(thread.id);

    // Find the last message for the current run
    const lastMessage = messageList.data
      .filter((message: any) => message.run_id === run.id && message.role === "assistant")
      .pop();

    // Print the last message coming from the assistant
    if (lastMessage) {
      console.log(lastMessage.content[0]["text"].value);
      setMessages([...messages, createNewMessage(lastMessage.content[0]["text"].value, false)]);
    }
  };

  // detect enter key and send message
  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <Container>
      {!assistant ? (
        <div>
            <TextField
              label="Type your api key"
              variant="outlined"
              fullWidth
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              sx={{ pb: 1 }}
            />
            <TextField
              label="Type your assistantId"
              variant="outlined"
              fullWidth
              value={assistantId}
              onChange={(e) => setAssistantId(e.target.value)}
              sx={{ pb: 1 }}
            />
          <div>
            <Button variant="contained" color="primary" onClick={handleInit} sx={{ pb: 1 }}>
              Init
            </Button>
            {error && <Alert severity="error">{error}</Alert>}
          </div>
        </div>
      ) : (
        <Grid container direction="column" spacing={2} paddingBottom={5}>
          {messages.map((message, index) => (
            <Grid item alignSelf={message.isUser ? "flex-end" : "flex-start"} key={index}>
              <Message key={index} message={message} />
            </Grid>
          ))}
          <Grid item>
            <TextField
              label="Type your message"
              variant="outlined"
              disabled={isWaiting}
              fullWidth
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
            />
            {isWaiting && <LinearProgress color="inherit" />}
          </Grid>
          {!isWaiting && (
            <Grid item>
              <Button variant="contained" color="primary" onClick={handleSendMessage} disabled={isWaiting}>
                Send
              </Button>
            </Grid>
          )}
        </Grid>
      )}
    </Container>
  );
};

export default Chat;