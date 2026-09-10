import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text);
    setText('');
  };

  return (
    <div className="p-4 bg-white border-t border-[#FCE7F3]">
      <form
        id="companion-chat-form"
        onSubmit={handleSubmit}
        className="flex items-center gap-2"
      >
        <input
          id="companion-chat-input"
          name="chatMessage"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask Maguva about iron absorption, AYUSH remedies, or meal plans..."
          className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#F43F5E] focus:bg-white"
        />
        <button
          id="companion-chat-submit"
          type="submit"
          aria-label="Send message"
          disabled={disabled || !text.trim()}
          className="flex items-center justify-center w-11 h-11 rounded-2xl bg-[#F43F5E] hover:bg-[#E11D48] text-white shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
