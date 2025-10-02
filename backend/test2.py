from strands import Agent, tool
from strands.models import BedrockModel
from dotenv import load_dotenv
load_dotenv()

model = BedrockModel(model_id="amazon.nova-pro-v1:0")
agent = Agent(model=model, system_prompt="You are a helpful assistant.")

response = agent(prompt="What is the capital of France?")
print(response)

