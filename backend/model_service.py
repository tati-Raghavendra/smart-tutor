import threading
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL_NAME = "Qwen/Qwen2.5-0.5B-Instruct"

class ModelService:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.loading = False
        self.lock = threading.Lock()

    def load_model(self):
        with self.lock:
            if self.model is not None:
                return
            
            self.loading = True
            try:
                print(f"Loading tokenizer for {MODEL_NAME}...")
                self.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
                print(f"Loading model {MODEL_NAME}...")
                # Load on CPU, using bfloat16 or float32. CPU inference is stable with float32 or bfloat16.
                # Qwen2.5 is compatible with torch.bfloat16 even on CPU for most modern systems, but float32 is safest.
                self.model = AutoModelForCausalLM.from_pretrained(
                    MODEL_NAME,
                    torch_dtype=torch.float32,
                    device_map="cpu"
                )
                print("Model loaded successfully!")
            except Exception as e:
                print(f"Error loading model: {e}")
                raise e
            finally:
                self.loading = False

    def generate_response(self, messages: list, max_new_tokens: int = 512) -> str:
        if self.model is None or self.tokenizer is None:
            self.load_model()

        # Format input using tokenizer's template
        text = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )
        
        model_inputs = self.tokenizer([text], return_tensors="pt").to("cpu")

        # Generate response
        with torch.no_grad():
            generated_ids = self.model.generate(
                **model_inputs,
                max_new_tokens=max_new_tokens,
                do_sample=True,
                temperature=0.7,
                top_p=0.9,
            )
        
        # Remove input tokens from output
        generated_ids = [
            output_ids[len(input_ids):] for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)
        ]

        response = self.tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]
        return response

# Single global instance
model_service = ModelService()
