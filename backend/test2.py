from dotenv import load_dotenv
from langgraph.prebuilt import create_react_agent
from langchain_tavily import TavilySearch
from langgraph.checkpoint.memory import MemorySaver

load_dotenv()

def check_weather(location: str) -> str:
    '''Return the weather forecast for the specified location.'''
    return f"It's always sunny in {location}"

def think(thought: str) -> str:
    '''Record private intermediate thoughts'''
    return "Thought:" + thought

tool_search = TavilySearch(max_results=2)

memory = MemorySaver()
graph = create_react_agent(
    "openai:gpt-4o",
    tools=[think, tool_search],
    prompt='''
        You are a helpful assistant. 
        You must think no less than 6 times before responding except for very trivial questions. 
        You are also allowed to look things up as many times as you want. 
        You have no token limit.
    ''',
    checkpointer=memory
)

config = {"configurable": {"thread_id": "1"}}

def stream_graph_updates(user_input: str):

    for message_chunk, metadata in graph.stream({"messages": [{"role": "user", "content": user_input}]}, config, stream_mode="messages"):
        if message_chunk.content:
            print(message_chunk.content, end="|", flush=True)

while True:

    user_input = input("User: ")
    if user_input.lower() in ["quit", "exit", "q"]:
        print("Goodbye!")
        break

    stream_graph_updates(user_input)