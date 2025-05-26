## From: https://langchain-ai.github.io/langgraph/tutorials/get-started/4-human-in-the-loop/

from typing import Annotated

from langchain_tavily import TavilySearch
from langchain_core.messages import BaseMessage
from typing_extensions import TypedDict

from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
import os
from langchain.chat_models import init_chat_model
from dotenv import load_dotenv

load_dotenv()

from typing import Annotated

from langchain.chat_models import init_chat_model
from langchain_tavily import TavilySearch
from langchain_core.messages import BaseMessage
from typing_extensions import TypedDict

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from typing import Annotated, TypedDict, List
from langgraph.graph.message import add_messages
from langchain.tools import tool
from langchain_core.messages import ToolMessage
import json

class State(TypedDict):
    messages: Annotated[list, add_messages]
    scratchpad: Annotated[List[str], lambda old, new: old + new]

graph_builder = StateGraph(State)

tool_search = TavilySearch(max_results=2)

@tool
def scratch_pad(note: str) -> str:
    """
    Write an internal note.  The returned text is ignored,
    but LangGraph must get *something* back from each tool.
    """
    print(str)
    return "noted"
tools = [tool_search, scratch_pad]

llm = init_chat_model("openai:gpt-4.1")
llm_with_tools = llm.bind_tools(tools)

def chatbot(state: State):
    return {"messages": [llm_with_tools.invoke(state["messages"])]}


# class ScratchAwareToolNode:
#     def __init__(self, tools):
#         self.tool_node = ToolNode(tools=tools)

#     def __call__(self, state: State) -> State:
#         # Run whatever tool(s) the model just called
#         out = self.tool_node(state)
#         new_messages = out["messages"]

#         # If the call was to scratch_pad, stash the note
#         if (
#             new_messages
#             and new_messages[-1].type == "tool"
#             and new_messages[-1].name == "scratch_pad"
#         ):
#             # the tool invocation (role="tool") is the *result*;
#             # the actual note is the argument sent in the preceding
#             # assistant "function_call" message
#             func_call_msg = new_messages[-2]
#             note = func_call_msg.kwargs["note"]
#             return {"scratchpad": [note]}  # merged by reducer above

#         # Otherwise just pass the normal messages on
#         return {"messages": new_messages}

# class BasicToolNode:
#     """A node that runs the tools requested in the last AIMessage."""

#     def __init__(self, tools: list) -> None:
#         self.tools_by_name = {tool.name: tool for tool in tools}

#     def __call__(self, inputs: dict):
#         if messages := inputs.get("messages", []):
#             message = messages[-1]
#         else:
#             raise ValueError("No message found in input")
#         outputs = []
#         for tool_call in message.tool_calls:
#             tool_result = self.tools_by_name[tool_call["name"]].invoke(
#                 tool_call["args"]
#             )
#             outputs.append(
#                 ToolMessage(
#                     content=json.dumps(tool_result),
#                     name=tool_call["name"],
#                     tool_call_id=tool_call["id"],
#                 )
#             )
#         return {"messages": outputs}

graph_builder.add_node("chatbot", chatbot)

tool_node = ScratchAwareToolNode(tools=[tool])
graph_builder.add_node("tools", tool_node)

graph_builder.add_conditional_edges(
    "chatbot",
    tools_condition,
)
graph_builder.add_edge("tools", "chatbot")
graph_builder.set_entry_point("chatbot")
memory = MemorySaver()
graph = graph_builder.compile(checkpointer=memory)

config = {"configurable": {"thread_id": "1"}}

def stream_graph_updates(user_input: str):

    events = graph.stream(
        {"messages": [{"role": "user", "content": user_input}]},
        config,
        stream_mode="values",
    )
    for event in events:
        event["messages"][-1].pretty_print()

while True:

    user_input = input("User: ")
    if user_input.lower() in ["quit", "exit", "q"]:
        print("Goodbye!")
        break

    stream_graph_updates(user_input)