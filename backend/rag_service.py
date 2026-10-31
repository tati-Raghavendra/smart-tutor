import re
import math
import uuid
from datetime import datetime
from typing import List, Dict, Optional, Tuple
import pymupdf

# Common English stop words to filter out during tokenization for cleaner BM25 ranking
STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", 
    "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", 
    "but", "by", "can", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", 
    "doing", "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", 
    "has", "hasn't", "have", "haven't", "having", "he", "her", "here", "hers", "herself", "him", 
    "himself", "his", "how", "i", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", 
    "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", 
    "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", 
    "same", "shan't", "she", "should", "shouldn't", "so", "some", "such", "than", "that", "the", 
    "their", "theirs", "them", "themselves", "then", "there", "these", "they", "this", "those", 
    "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "were", "weren't", 
    "what", "when", "where", "which", "while", "who", "whom", "why", "with", "won't", "would", 
    "wouldn't", "you", "your", "yours", "yourself", "yourselves"
}

class DocumentChunk:
    def __init__(
        self,
        chunk_id: str,
        doc_id: str,
        filename: str,
        page_num: int,
        chunk_index: int,
        text: str,
        tokens: List[str]
    ):
        self.chunk_id = chunk_id
        self.doc_id = doc_id
        self.filename = filename
        self.page_num = page_num
        self.chunk_index = chunk_index
        self.text = text
        self.tokens = tokens
        self.length = len(tokens)

    def to_dict(self) -> dict:
        return {
            "chunk_id": self.chunk_id,
            "doc_id": self.doc_id,
            "filename": self.filename,
            "page_num": self.page_num,
            "chunk_index": self.chunk_index,
            "text": self.text,
            "char_count": len(self.text)
        }

class DocumentRecord:
    def __init__(
        self,
        doc_id: str,
        filename: str,
        total_pages: int,
        total_chunks: int,
        total_words: int,
        file_size_bytes: int,
        upload_time: str
    ):
        self.doc_id = doc_id
        self.filename = filename
        self.total_pages = total_pages
        self.total_chunks = total_chunks
        self.total_words = total_words
        self.file_size_bytes = file_size_bytes
        self.upload_time = upload_time

    def to_dict(self) -> dict:
        return {
            "doc_id": self.doc_id,
            "filename": self.filename,
            "total_pages": self.total_pages,
            "total_chunks": self.total_chunks,
            "total_words": self.total_words,
            "file_size_bytes": self.file_size_bytes,
            "upload_time": self.upload_time
        }

class RAGService:
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.documents: Dict[str, DocumentRecord] = {}
        self.chunks: List[DocumentChunk] = []
        
        # BM25 Index state
        self.avg_doc_len = 0.0
        self.doc_freqs: Dict[str, int] = {}
        self.idf_cache: Dict[str, float] = {}

    @staticmethod
    def tokenize(text: str) -> List[str]:
        """Convert text into clean, lowercased alphanumeric tokens without stopwords."""
        words = re.findall(r'[a-zA-Z0-9_\-\.\+]+', text.lower())
        tokens = [w for w in words if len(w) > 1 and w not in STOP_WORDS]
        return tokens

    def _chunk_text(
        self,
        doc_id: str,
        filename: str,
        page_num: int,
        raw_text: str,
        start_chunk_idx: int
    ) -> List[DocumentChunk]:
        """
        Chunks page text. For slides, typically 1 page = 1 chunk.
        For dense pages (> 350 words), splits into overlapping windows.
        """
        words = raw_text.split()
        if not words:
            return []

        chunks = []
        max_words = 350
        overlap = 60

        if len(words) <= max_words:
            tokens = self.tokenize(raw_text)
            chunk = DocumentChunk(
                chunk_id=f"{doc_id}_p{page_num}_c{start_chunk_idx}",
                doc_id=doc_id,
                filename=filename,
                page_num=page_num,
                chunk_index=start_chunk_idx,
                text=raw_text.strip(),
                tokens=tokens
            )
            chunks.append(chunk)
        else:
            idx = 0
            curr_chunk_idx = start_chunk_idx
            while idx < len(words):
                chunk_words = words[idx:idx + max_words]
                chunk_text = " ".join(chunk_words).strip()
                tokens = self.tokenize(chunk_text)
                chunk = DocumentChunk(
                    chunk_id=f"{doc_id}_p{page_num}_c{curr_chunk_idx}",
                    doc_id=doc_id,
                    filename=filename,
                    page_num=page_num,
                    chunk_index=curr_chunk_idx,
                    text=chunk_text,
                    tokens=tokens
                )
                chunks.append(chunk)
                curr_chunk_idx += 1
                idx += (max_words - overlap)

        return chunks

    def process_pdf(self, file_bytes: bytes, filename: str) -> Tuple[DocumentRecord, List[DocumentChunk]]:
        """Parses PDF bytes, extracts text per page/slide, and returns document record and chunks."""
        doc_id = str(uuid.uuid4())[:8]
        doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        
        all_chunks: List[DocumentChunk] = []
        total_words = 0
        total_pages = len(doc)
        chunk_idx = 0

        for page_idx in range(total_pages):
            page = doc[page_idx]
            page_text = page.get_text("text").strip()
            page_num = page_idx + 1

            if not page_text:
                continue

            total_words += len(page_text.split())
            page_chunks = self._chunk_text(
                doc_id=doc_id,
                filename=filename,
                page_num=page_num,
                raw_text=page_text,
                start_chunk_idx=chunk_idx
            )
            all_chunks.extend(page_chunks)
            chunk_idx += len(page_chunks)

        doc.close()

        record = DocumentRecord(
            doc_id=doc_id,
            filename=filename,
            total_pages=total_pages,
            total_chunks=len(all_chunks),
            total_words=total_words,
            file_size_bytes=len(file_bytes),
            upload_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )
        return record, all_chunks

    def process_text_file(self, content: str, filename: str, file_size_bytes: int) -> Tuple[DocumentRecord, List[DocumentChunk]]:
        """Parses plain text / markdown file and splits into sections as slides/pages."""
        doc_id = str(uuid.uuid4())[:8]
        # Split by markdown headers (# ...) or multiple newlines
        sections = re.split(r'\n(?=#{1,3}\s)', content)
        if len(sections) <= 1:
            sections = content.split('\n\n\n')

        all_chunks: List[DocumentChunk] = []
        total_words = 0
        chunk_idx = 0

        for section_idx, sec in enumerate(sections):
            sec_text = sec.strip()
            if not sec_text:
                continue
            page_num = section_idx + 1
            total_words += len(sec_text.split())
            page_chunks = self._chunk_text(
                doc_id=doc_id,
                filename=filename,
                page_num=page_num,
                raw_text=sec_text,
                start_chunk_idx=chunk_idx
            )
            all_chunks.extend(page_chunks)
            chunk_idx += len(page_chunks)

        record = DocumentRecord(
            doc_id=doc_id,
            filename=filename,
            total_pages=max(1, len(sections)),
            total_chunks=len(all_chunks),
            total_words=total_words,
            file_size_bytes=file_size_bytes,
            upload_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )
        return record, all_chunks

    def add_document(self, file_bytes: bytes, filename: str) -> DocumentRecord:
        """Adds a document (PDF, TXT, MD) to the RAG index."""
        lower_name = filename.lower()
        if lower_name.endswith(".pdf"):
            record, chunks = self.process_pdf(file_bytes, filename)
        elif lower_name.endswith(".txt") or lower_name.endswith(".md"):
            try:
                text_content = file_bytes.decode("utf-8")
            except UnicodeDecodeError:
                text_content = file_bytes.decode("latin-1", errors="ignore")
            record, chunks = self.process_text_file(text_content, filename, len(file_bytes))
        else:
            raise ValueError("Unsupported file type. Please upload a PDF, TXT, or MD file.")

        self.documents[record.doc_id] = record
        self.chunks.extend(chunks)
        self.reindex()
        return record

    def remove_document(self, doc_id: str) -> bool:
        """Removes a document and all its chunks from index."""
        if doc_id in self.documents:
            del self.documents[doc_id]
            self.chunks = [c for c in self.chunks if c.doc_id != doc_id]
            self.reindex()
            return True
        return False

    def clear_all(self):
        """Clears all indexed documents and chunks."""
        self.documents.clear()
        self.chunks.clear()
        self.avg_doc_len = 0.0
        self.doc_freqs.clear()
        self.idf_cache.clear()

    def get_document_slides(self, doc_id: str) -> List[Dict]:
        """Returns ordered slide previews for a document."""
        if doc_id not in self.documents:
            return []

        doc_chunks = [c for c in self.chunks if c.doc_id == doc_id]
        slides_map: Dict[int, List[str]] = {}
        for c in doc_chunks:
            slides_map.setdefault(c.page_num, []).append(c.text)

        result = []
        for page_num in sorted(slides_map.keys()):
            full_text = "\n\n".join(slides_map[page_num]).strip()
            # Extract first meaningful line as title
            lines = [l.strip() for l in full_text.split('\n') if l.strip()]
            title = lines[0] if lines else f"Slide {page_num}"
            if len(title) > 60:
                title = title[:57] + "..."

            result.append({
                "page_num": page_num,
                "title": title,
                "text": full_text,
                "word_count": len(full_text.split()),
                "filename": self.documents[doc_id].filename
            })
        return result

    def get_slide_content(self, doc_id: str, page_num: int) -> Optional[str]:
        """Gets full text for a specific slide."""
        chunks = [c.text for c in self.chunks if c.doc_id == doc_id and c.page_num == page_num]
        return "\n\n".join(chunks) if chunks else None

    def format_slide_explanation_prompt(self, filename: str, page_num: int, slide_text: str) -> List[Dict]:
        """Creates a lecture presentation script prompt for the tutor avatar."""
        system_instruction = (
            "You are an inspiring, friendly AI Tutor presenting this slide in a classroom.\n\n"
            f"Slide Material [Document: {filename} | Slide {page_num}]:\n"
            f"{slide_text}\n\n"
            "YOUR TASK:\n"
            "- Deliver a natural, spoken lecture explanation of this slide.\n"
            "- Speak directly to the student in a clear, educational, and engaging tone.\n"
            "- Break down the key concept, explain WHY it matters, and give a brief intuitive analogy or example.\n"
            "- Keep it between 3 to 5 clear sentences so it narrates naturally without feeling overwhelming.\n"
            "- Do NOT include robotic preambles like 'On this slide' or 'As an AI tutor'. Jump straight into presenting!"
        )
        return [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": f"Present and explain Slide {page_num} clearly to the class."}
        ]

    def reindex(self):
        """Recomputes document frequencies and BM25 IDF weights for all tokens."""
        N = len(self.chunks)
        if N == 0:
            self.avg_doc_len = 0.0
            self.doc_freqs.clear()
            self.idf_cache.clear()
            return

        total_tokens = sum(c.length for c in self.chunks)
        self.avg_doc_len = total_tokens / N if N > 0 else 1.0

        # Document frequency: number of chunks containing token t
        doc_freqs: Dict[str, int] = {}
        for chunk in self.chunks:
            seen_tokens = set(chunk.tokens)
            for token in seen_tokens:
                doc_freqs[token] = doc_freqs.get(token, 0) + 1

        self.doc_freqs = doc_freqs

        # Precompute IDF using standard BM25 formula
        self.idf_cache = {}
        for token, df in doc_freqs.items():
            # Standard BM25 IDF with smoothing
            idf = math.log(1.0 + (N - df + 0.5) / (df + 0.5))
            self.idf_cache[token] = max(idf, 0.05)

    def retrieve(self, query: str, top_k: int = 4) -> List[Dict]:
        """
        Retrieves the top_k most relevant chunks using BM25 ranking
        with exact phrase match boosting.
        """
        if not self.chunks:
            return []

        query_tokens = self.tokenize(query)
        if not query_tokens:
            return []

        raw_query_lower = query.lower().strip()
        scores: List[Tuple[float, DocumentChunk]] = []

        for chunk in self.chunks:
            score = 0.0
            chunk_token_counts: Dict[str, int] = {}
            for t in chunk.tokens:
                chunk_token_counts[t] = chunk_token_counts.get(t, 0) + 1

            chunk_len = chunk.length
            len_norm = 1.0 - self.b + self.b * (chunk_len / max(self.avg_doc_len, 1.0))

            # BM25 sum over matching query terms
            for qt in query_tokens:
                tf = chunk_token_counts.get(qt, 0)
                if tf > 0:
                    idf = self.idf_cache.get(qt, 0.1)
                    numerator = tf * (self.k1 + 1.0)
                    denominator = tf + self.k1 * len_norm
                    score += idf * (numerator / denominator)

            # Bonus for exact query phrase match
            if raw_query_lower in chunk.text.lower():
                score += 2.0

            if score > 0.1:
                scores.append((score, chunk))

        # Sort descending by relevance score
        scores.sort(key=lambda x: x[0], reverse=True)

        results = []
        for score, chunk in scores[:top_k]:
            results.append({
                "chunk_id": chunk.chunk_id,
                "doc_id": chunk.doc_id,
                "filename": chunk.filename,
                "page_num": chunk.page_num,
                "score": round(score, 3),
                "text": chunk.text,
                "preview": chunk.text[:200] + ("..." if len(chunk.text) > 200 else "")
            })

        return results

    def format_tutor_prompt(
        self,
        messages: List[Dict],
        retrieved_chunks: List[Dict]
    ) -> List[Dict]:
        """
        Constructs a prompt enriched with retrieved lecture context
        for the tutor LLM while maintaining conversational flow.
        """
        if not retrieved_chunks:
            # If no lecture documents are active or relevant
            system_msg = {
                "role": "system",
                "content": (
                    "You are a friendly, direct, and encouraging Smart AI Tutor. "
                    "Explain concepts clearly, provide helpful examples, and format responses "
                    "with clear bullet points, headings, LaTeX math notation ($x^2$ or $$\\frac{a}{b}$$) "
                    "for equations, and fenced code blocks for algorithms without filler or meta-statements."
                )
            }
            return [system_msg] + messages

        # Build context block
        context_sections = []
        for i, c in enumerate(retrieved_chunks):
            context_sections.append(
                f"[Excerpt {i+1} | Source: {c['filename']} | Slide/Page {c['page_num']}]\n"
                f"{c['text']}"
            )
        context_text = "\n\n".join(context_sections)

        system_instruction = (
            "You are an expert AI Smart Tutor explaining course materials directly to a student.\n\n"
            "Lecture Material Reference Excerpts:\n"
            f"{context_text}\n\n"
            "CRITICAL INSTRUCTIONS:\n"
            "1. Answer the student's question directly and immediately. Do NOT start with introductory filler or "
            "alignment statements like 'Based on the provided excerpts', 'According to your notes', or 'Here is the explanation'.\n"
            "2. Ground your explanation in the lecture excerpts and cite slides using [Slide X] or [Page X].\n"
            "3. Format formulas and mathematical equations using standard LaTeX math: inline like $E = mc^2$ or block like $$\\sum_{i=1}^n x_i$$.\n"
            "4. Format code implementations using fenced code blocks with language tags (e.g., ```python ... ```).\n"
            "5. Format your response cleanly using structured headings, bullet points, and comparison tables when helpful.\n"
            "6. If a concept is outside the notes, explain it directly and simply state that it wasn't in the slides."
        )

        system_msg = {"role": "system", "content": system_instruction}
        return [system_msg] + messages

    @staticmethod
    def clean_response(text: str) -> str:
        """
        Polishes the generated tutor response:
        - Removes robotic preambles and alignment statements ('Based on the provided lecture excerpts...', etc.)
        - Strips any accidental prompt leakage, divider lines, or source bracket echoes.
        - Capitalizes properly and trims trailing conversational filler.
        """
        if not text:
            return ""

        # Remove divider echoes
        text = re.sub(r'={4,}', '', text)
        text = re.sub(r'\[Excerpt \d+ \| Source:[^\]]+\]', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\[Source \d+ \| Document:[^\]]+\]', '', text, flags=re.IGNORECASE)
        text = re.sub(r'CRITICAL INSTRUCTIONS:.*?(?=\n\n|\Z)', '', text, flags=re.IGNORECASE | re.DOTALL)
        text = re.sub(r'Lecture Material Reference Excerpts:.*?(?=\n\n|\Z)', '', text, flags=re.IGNORECASE | re.DOTALL)

        # Strip robotic preamble lines
        preamble_patterns = [
            r'^\s*(?:Based on|According to) (?:the )?(?:provided |uploaded )?(?:lecture |course |excerpts?|notes?|slides?)[^,:\n]{0,80}[,:]\s*',
            r'^\s*Here is (?:the |an )?(?:answer|explanation)(?: based on (?:the )?(?:provided |uploaded )?(?:lecture |notes |slides |excerpts )?)?[^,:\n]{0,80}[,:]\s*',
            r'^\s*As an? (?:AI )?(?:Smart )?Tutor[,:]\s*',
            r'^\s*Sure,?\s+(?:here is|I can help you with)[^,:\n]{0,80}[,:]\s*',
        ]
        for pat in preamble_patterns:
            text = re.sub(pat, '', text, flags=re.IGNORECASE | re.MULTILINE)

        # Remove trailing filler
        text = re.sub(
            r'\n+(?:I hope this helps[!.]*|Let me know if you have any questions[!.]*|Feel free to ask[!.]*)$',
            '',
            text,
            flags=re.IGNORECASE
        )

        text = text.strip()
        # Capitalize first character if needed
        if text and text[0].islower():
            text = text[0].upper() + text[1:]

        return text

# Global RAG service singleton
rag_service = RAGService()
