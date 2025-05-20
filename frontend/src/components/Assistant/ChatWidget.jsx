import { useState, useRef, useEffect } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import { BiSend, BiX, BiMessageRoundedDots, BiExpandAlt, BiCollapseAlt } from 'react-icons/bi';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../../context/AuthContext';
import './ChatWidget.css';

export default function ChatWidget() {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'How can I help you today?' }
    ]);
    const [input, setInput] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const messagesEndRef = useRef(null);
    const { isAuthenticated } = useAuth();
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        
        // Add user message
        setMessages(prev => [...prev, { role: 'user', content: input }]);
        const userQuestion = input;
        setInput('');
        setIsLoading(true);
        
        try {
            // Call your Ollama API
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'DiabetesAssistant',
                    prompt: userQuestion,
                    stream: false
                }),
            });
            
            const data = await response.json();
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: data.response
            }]);
        } catch (error) {
            console.error('Error fetching from Ollama:', error);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: 'Sorry, I encountered an error. Please try again.' 
            }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const toggleChat = () => setIsOpen(!isOpen);
    const toggleExpand = () => setIsExpanded(!isExpanded);
    
    // Only render the chat widget if user is authenticated
    if (!isAuthenticated) {
        return null;
    }
    
    return (
        <div className={`chat-widget-container ${isExpanded ? 'expanded' : ''}`}>
            {!isOpen ? (
                <Button 
                    className="chat-button"
                    onClick={toggleChat}
                    variant="primary"
                >
                    <BiMessageRoundedDots size={24} />
                </Button>
            ) : (
                <Card className="chat-widget">
                    <Card.Header className="widget-header">
                        <div className="widget-title">Diabetes Assistant</div>
                        <div className="widget-controls">
                            <Button 
                                variant="link" 
                                className="control-button"
                                onClick={toggleExpand}
                            >
                                {isExpanded ? <BiCollapseAlt /> : <BiExpandAlt />}
                            </Button>
                            <Button 
                                variant="link" 
                                className="control-button"
                                onClick={toggleChat}
                            >
                                <BiX />
                            </Button>
                        </div>
                    </Card.Header>
                    <Card.Body className="messages-container">
                        {messages.map((msg, index) => (
                            <div 
                                key={index} 
                                className={`message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}
                            >
                                <div className="message-content">
                                    {msg.role === 'assistant' ? (
                                        <div className="markdown-content">
                                            <ReactMarkdown>
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        msg.content
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="message assistant-message">
                                <div className="message-content">
                                    <div className="typing-indicator">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </Card.Body>
                    <Card.Footer className="input-container">
                        <Form onSubmit={handleSubmit} className="d-flex">
                            <Form.Control
                                type="text"
                                placeholder="Ask anything"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={isLoading}
                            />
                            <Button 
                                variant="primary" 
                                type="submit" 
                                disabled={isLoading || !input.trim()}
                                className="send-button ms-2"
                            >
                                <BiSend />
                            </Button>
                        </Form>
                    </Card.Footer>
                </Card>
            )}
        </div>
    );
}