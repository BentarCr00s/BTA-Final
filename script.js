const typingForm = document.querySelector(".typing-form");
const chatContainer = document.querySelector(".chat-list");
const suggestions = document.querySelectorAll(".suggestion");
const toggleThemeButton = document.querySelector("#theme-toggle-button");
const deleteChatButton = document.querySelector("#delete-chat-button");

// State variables
let userMessage = null;
let isResponseGenerating = false;
let chatHistory = []; // Initialize chat history array

// API configuration
const API_KEY = "AIzaSyAcyK2rjPuklSaDta4QCSiXQYbeOREjmNQ"; // Your API key here
const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${API_KEY}`;

// Load theme and chat data from local storage on page load
const loadDataFromLocalstorage = () => {
  const savedChats = localStorage.getItem("saved-chats");
  chatHistory = JSON.parse(savedChats) || []; // Load chat history from local storage or set as empty array

  const isLightMode = localStorage.getItem("themeColor") === "light_mode";
  document.body.classList.toggle("light_mode", isLightMode);
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";

  // Restore saved chats or clear the chat container
  chatContainer.innerHTML = chatHistory.map((chat) => chat.html).join("") || "";
  document.body.classList.toggle("hide-header", chatHistory.length > 0);

  chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to the bottom
};

// Create a new message element and return it
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

// Show typing effect by displaying words one by one
const showTypingEffect = (text, textElement, incomingMessageDiv) => {
  const words = text.split(" ");
  let currentWordIndex = 0;

  const typingInterval = setInterval(() => {
    // Append each word to the text element with a space
    textElement.innerText +=
      (currentWordIndex === 0 ? "" : " ") + words[currentWordIndex++];
    incomingMessageDiv.querySelector(".icon").classList.add("hide");

    // If all words are displayed
    if (currentWordIndex === words.length) {
      clearInterval(typingInterval);
      isResponseGenerating = false;
      incomingMessageDiv.querySelector(".icon").classList.remove("hide");
      localStorage.setItem("saved-chats", JSON.stringify(chatHistory)); // Save chats to local storage
    }
    chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to the bottom
  }, 75);
};

// Save chat to history
const saveChatToHistory = (html, message, role) => {
  chatHistory.push({ html, message, role });
  localStorage.setItem("saved-chats", JSON.stringify(chatHistory));
};

// Fetch response from the API based on user message
const generateAPIResponse = async (incomingMessageDiv) => {
  const textElement = incomingMessageDiv.querySelector(".text");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: chatHistory
          .map((chat) => ({
            role: chat.role,
            parts: [{ text: chat.message }],
          }))
          .concat({
            role: "user",
            parts: [{ text: userMessage }],
          }),
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    const apiResponse = data?.candidates[0].content.parts[0].text.replace(
      /\*\*(.*?)\*\*/g,
      "$1"
    );
    showTypingEffect(apiResponse, textElement, incomingMessageDiv);

    saveChatToHistory(incomingMessageDiv.outerHTML, apiResponse, "model"); // Save the model's response to history
  } catch (error) {
    isResponseGenerating = false;
    textElement.innerText = error.message;
    textElement.parentElement.closest(".message").classList.add("error");
  } finally {
    incomingMessageDiv.classList.remove("loading");
  }
};

// Show a loading animation while waiting for the API response
const showLoadingAnimation = () => {
  const html = `<div class="message-content">
                  <img class="avatar" src="assets/my/logo-bta.png" alt="Gemini avatar">
                  <p class="text"></p>
                  <div class="loading-indicator">
                    <div class="loading-bar"></div>
                    <div class="loading-bar"></div>
                    <div class="loading-bar"></div>
                  </div>
                </div>
                <span onClick="copyMessage(this)" class="icon material-symbols-rounded">content_copy</span>`;

  const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
  chatContainer.appendChild(incomingMessageDiv);

  chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to the bottom
  generateAPIResponse(incomingMessageDiv);
};

// Copy message text to the clipboard
const copyMessage = (copyButton) => {
  const messageText = copyButton.parentElement.querySelector(".text").innerText;

  navigator.clipboard.writeText(messageText);
  copyButton.innerText = "done"; // Show confirmation icon
  setTimeout(() => (copyButton.innerText = "content_copy"), 1000); // Revert icon after 1 second
};

// Handle sending outgoing chat messages
const handleOutgoingChat = () => {
  userMessage =
    typingForm.querySelector(".typing-input").value.trim() || userMessage;
  if (!userMessage || isResponseGenerating) return; // Exit if there is no message or response is generating

  isResponseGenerating = true;

  const html = `<div class="message-content">
                  <img class="avatar" src="https://www.svgrepo.com/show/170633/profile-user.svg" alt="User avatar">
                  <p class="text"></p>
                </div>`;

  const outgoingMessageDiv = createMessageElement(html, "outgoing");
  outgoingMessageDiv.querySelector(".text").innerText = userMessage;
  chatContainer.appendChild(outgoingMessageDiv);

  saveChatToHistory(outgoingMessageDiv.outerHTML, userMessage, "user"); // Save the message to history

  typingForm.reset(); // Clear input field
  document.body.classList.add("hide-header");
  chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to the bottom
  setTimeout(showLoadingAnimation, 500); // Show loading animation after a delay
};

// Toggle between light and dark themes
toggleThemeButton.addEventListener("click", () => {
  const isLightMode = document.body.classList.toggle("light_mode");
  localStorage.setItem("themeColor", isLightMode ? "light_mode" : "dark_mode");
  toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
});

// Delete all chats from local storage when button is clicked
deleteChatButton.addEventListener("click", () => {
  if (confirm("Are you sure you want to delete all the chats?")) {
    localStorage.removeItem("saved-chats");
    chatHistory = []; // Clear chat history
    loadDataFromLocalstorage();
  }
});

// Set userMessage and handle outgoing chat when a suggestion is clicked
suggestions.forEach((suggestion) => {
  suggestion.addEventListener("click", () => {
    userMessage = suggestion.querySelector(".text").innerText;
    handleOutgoingChat();
  });
});

// Prevent default form submission and handle outgoing chat
typingForm.addEventListener("submit", (e) => {
  e.preventDefault();
  handleOutgoingChat();
});

// Set initial chat history
const setInitialChatHistory = (initialMessages) => {
  chatHistory = initialMessages.map((message) => {
    const html = `<div class="message-content">
                    <img class="avatar" src="${
                      message.role === "user"
                        ? "https://www.svgrepo.com/show/170633/profile-user.svg"
                        : "assets/my/logo-bta.png"
                    }" alt="${
      message.role === "user" ? "User" : "Gemini"
    } avatar">
                    <p class="text">${message.content}</p>
                  </div>
                  <span onClick="copyMessage(this)" class="icon material-symbols-rounded">content_copy</span>`;
    return {
      html: createMessageElement(
        html,
        message.role === "user" ? "outgoing" : "incoming"
      ).outerHTML,
      message: message.content,
      role: message.role,
    };
  });
  localStorage.setItem("saved-chats", JSON.stringify(chatHistory));
  loadDataFromLocalstorage();
};

// Example of setting initial chat history
setInitialChatHistory([
  {
    role: "model",
    content: "Hallo Ada Yang bisa saya bantu mengenai Travel di Bandung?",
  },
  {
    role: "model",
    content:
      "saya bisa merekomendasikan tempat tempat yang bagus dan merencanakan perjalanan anda",
  },
]);

loadDataFromLocalstorage(); // Load data from local storage when the page loads
