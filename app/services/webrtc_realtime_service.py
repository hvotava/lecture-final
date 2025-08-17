import os
import json
import base64
import asyncio
import logging
from typing import Dict, Any, Optional, Callable
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCConfiguration, RTCIceServer
from aiortc.contrib.media import MediaStreamTrack
import websockets
import aiohttp
from flask import current_app

logger = logging.getLogger(__name__)

class WebRTCRealtimeService:
    """Služba pro WebRTC propojení s OpenAI Realtime API."""
    
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        self.openai_ws_url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
        self.pc = None
        self.openai_ws = None
        self.is_connected = False
        self.lesson_context = ""
        
        # WebRTC konfigurace
        self.rtc_config = RTCConfiguration(
            iceServers=[
                RTCIceServer(urls="stun:stun.l.google.com:19302"),
                RTCIceServer(urls="stun:stun1.l.google.com:19302"),
            ]
        )
        
    async def create_peer_connection(self):
        """Vytvoří nové RTCPeerConnection."""
        self.pc = RTCPeerConnection(configuration=self.rtc_config)
        
        @self.pc.on("connectionstatechange")
        async def on_connectionstatechange():
            logger.info(f"WebRTC connection state: {self.pc.connectionState}")
            
        @self.pc.on("iceconnectionstatechange")
        async def on_iceconnectionstatechange():
            logger.info(f"ICE connection state: {self.pc.iceConnectionState}")
            
        return self.pc
        
    async def connect_to_openai(self, lesson_context: str = ""):
        """Připojí se k OpenAI Realtime API přes WebSocket."""
        try:
            self.lesson_context = lesson_context
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "OpenAI-Beta": "realtime=v1"
            }
            
            self.openai_ws = await websockets.connect(
                self.openai_ws_url,
                extra_headers=headers
            )
            
            # Konfigurace session
            session_config = {
                "type": "session.update",
                "session": {
                    "modalities": ["text", "audio"],
                    "instructions": lesson_context or "Jsi AI asistent pro výuku jazyků. Komunikuj pouze v češtině.",
                    "voice": "alloy",
                    "input_audio_format": "pcm16",  # WebRTC používá PCM16
                    "output_audio_format": "pcm16",
                    "input_audio_transcription": {"model": "whisper-1"},
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.5,
                        "prefix_padding_ms": 300,
                        "silence_duration_ms": 800
                    },
                    "tools": [],
                    "tool_choice": "auto",
                    "temperature": 0.8,
                    "max_response_output_tokens": 4096
                }
            }
            
            await self.openai_ws.send(json.dumps(session_config))
            self.is_connected = True
            logger.info("Úspěšně připojeno k OpenAI Realtime API")
            
        except Exception as e:
            logger.error(f"Chyba při připojování k OpenAI: {str(e)}")
            self.is_connected = False
            raise
            
    async def handle_webrtc_audio(self, audio_track):
        """Zpracovává audio z WebRTC a posílá do OpenAI."""
        try:
            async for frame in audio_track:
                if not self.is_connected or not self.openai_ws:
                    continue
                    
                # Konverze audio frame na base64 pro OpenAI
                audio_data = frame.to_ndarray()
                audio_bytes = audio_data.tobytes()
                audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
                
                # Odeslání do OpenAI
                message = {
                    "type": "input_audio_buffer.append",
                    "audio": audio_b64
                }
                
                await self.openai_ws.send(json.dumps(message))
                logger.debug("Audio odesláno do OpenAI")
                
        except Exception as e:
            logger.error(f"Chyba při zpracování WebRTC audio: {str(e)}")
            
    async def handle_openai_response(self, audio_callback: Callable[[bytes], None]):
        """Zpracovává odpovědi z OpenAI a vrací audio pro WebRTC."""
        try:
            async for message in self.openai_ws:
                data = json.loads(message)
                message_type = data.get('type', 'unknown')
                
                logger.debug(f"OpenAI zpráva: {message_type}")
                
                if message_type == 'response.audio.delta':
                    # Audio data z OpenAI
                    audio_data = data.get('delta', '')
                    if audio_data and audio_callback:
                        # Dekódování base64 audio dat
                        audio_bytes = base64.b64decode(audio_data)
                        await audio_callback(audio_bytes)
                        logger.debug("Audio odpověď odeslána do WebRTC")
                        
                elif message_type == 'response.audio.done':
                    logger.info("OpenAI dokončilo generování audio odpovědi")
                    
                elif message_type == 'input_audio_buffer.speech_started':
                    logger.info("Detekována řeč uživatele")
                    
                elif message_type == 'input_audio_buffer.speech_stopped':
                    logger.info("Uživatel přestal mluvit")
                    
                elif message_type == 'conversation.item.input_audio_transcription.completed':
                    transcript = data.get('transcript', '')
                    if transcript:
                        logger.info(f"Transkripce: {transcript}")
                        
        except Exception as e:
            logger.error(f"Chyba při zpracování OpenAI odpovědi: {str(e)}")
            
    async def create_offer(self) -> dict:
        """Vytvoří WebRTC offer."""
        try:
            if not self.pc:
                await self.create_peer_connection()
                
            # Přidání audio track
            @self.pc.on("track")
            async def on_track(track):
                logger.info(f"Přijat track: {track.kind}")
                if track.kind == "audio":
                    asyncio.create_task(self.handle_webrtc_audio(track))
                    
            offer = await self.pc.createOffer()
            await self.pc.setLocalDescription(offer)
            
            return {
                "type": offer.type,
                "sdp": offer.sdp
            }
            
        except Exception as e:
            logger.error(f"Chyba při vytváření offer: {str(e)}")
            raise
            
    async def handle_answer(self, answer_data: dict):
        """Zpracuje WebRTC answer."""
        try:
            answer = RTCSessionDescription(
                sdp=answer_data["sdp"],
                type=answer_data["type"]
            )
            await self.pc.setRemoteDescription(answer)
            logger.info("WebRTC answer zpracována")
            
        except Exception as e:
            logger.error(f"Chyba při zpracování answer: {str(e)}")
            raise
            
    async def add_ice_candidate(self, candidate_data: dict):
        """Přidá ICE candidate."""
        try:
            from aiortc import RTCIceCandidate
            
            candidate = RTCIceCandidate(
                component=candidate_data.get("component", 1),
                foundation=candidate_data.get("foundation", ""),
                ip=candidate_data.get("ip", ""),
                port=candidate_data.get("port", 0),
                priority=candidate_data.get("priority", 0),
                protocol=candidate_data.get("protocol", "udp"),
                type=candidate_data.get("type", "host")
            )
            
            await self.pc.addIceCandidate(candidate)
            logger.info("ICE candidate přidán")
            
        except Exception as e:
            logger.error(f"Chyba při přidávání ICE candidate: {str(e)}")
            
    async def disconnect(self):
        """Odpojí se od všech připojení."""
        try:
            if self.pc:
                await self.pc.close()
                self.pc = None
                logger.info("WebRTC spojení ukončeno")
                
            if self.openai_ws:
                await self.openai_ws.close()
                self.openai_ws = None
                logger.info("OpenAI WebSocket ukončen")
                
            self.is_connected = False
            
        except Exception as e:
            logger.error(f"Chyba při odpojování: {str(e)}")

class TwilioWebRTCHandler:
    """Handler pro Twilio WebRTC integraci."""
    
    def __init__(self):
        self.webrtc_service = WebRTCRealtimeService()
        
    async def handle_twilio_webrtc_call(self, call_data: dict, lesson_context: str = ""):
        """Zpracuje Twilio WebRTC hovor."""
        try:
            # Připojení k OpenAI
            await self.webrtc_service.connect_to_openai(lesson_context)
            
            # Vytvoření WebRTC peer connection
            await self.webrtc_service.create_peer_connection()
            
            # Vrácení konfigurace pro Twilio
            return {
                "status": "success",
                "webrtc_config": {
                    "ice_servers": [
                        {"urls": "stun:stun.l.google.com:19302"},
                        {"urls": "stun:stun1.l.google.com:19302"}
                    ]
                }
            }
            
        except Exception as e:
            logger.error(f"Chyba při zpracování Twilio WebRTC hovoru: {str(e)}")
            return {"status": "error", "message": str(e)}
            
    async def cleanup(self):
        """Vyčistí zdroje."""
        await self.webrtc_service.disconnect() 