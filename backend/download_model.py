import sys
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

MODEL_NAME = "Qwen/Qwen2.5-0.5B-Instruct"

def main():
    print(f"Downloading tokenizer for {MODEL_NAME}...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    print("Tokenizer downloaded successfully.")

    print(f"Downloading model {MODEL_NAME} (approx. 950MB)...")
    print("This may take a few minutes depending on your internet speed. A progress bar will show below.")
    
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        torch_dtype=torch.float32,
        device_map="cpu"
    )
    print("\nModel downloaded and cached successfully!")
    print("You can now restart your backend server or try chatting in the browser!")

if __name__ == "__main__":
    main()
