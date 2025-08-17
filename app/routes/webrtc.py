from flask import Blueprint, request, jsonify, current_app
import asyncio
import logging
from app.services.webrtc_realtime_service import WebRTCRealtimeService, TwilioWebRTCHandler
from app.models import Attempt, Lesson, User
from app.database import db

logger = logging.getLogger(__name__)

webrtc_bp = Blueprint('webrtc', __name__, url_prefix='/webrtc')

# Globální instance pro správu WebRTC spojení
webrtc_handlers = {}

@webrtc_bp.route('/voice/incoming', methods=['POST'])
async def handle_webrtc_incoming_call():
    """Zpracuje příchozí WebRTC hovor z Twilio."""
    try:
        # Získání parametrů z Twilio
        call_sid = request.form.get('CallSid')
        from_number = request.form.get('From')
        to_number = request.form.get('To')
        attempt_id = request.args.get('attempt_id')
        
        logger.info(f"WebRTC hovor přijat: {call_sid}, z {from_number} na {to_number}")
        
        # Získání kontextu lekce
        lesson_context = ""
        if attempt_id:
            attempt = Attempt.query.get(attempt_id)
            if attempt and attempt.lesson:
                lesson_context = f"Lekce: {attempt.lesson.title}. Obsah: {attempt.lesson.content[:500]}"
        
        # Vytvoření WebRTC handleru
        handler = TwilioWebRTCHandler()
        webrtc_handlers[call_sid] = handler
        
        # Konfigurace WebRTC hovoru
        config = await handler.handle_twilio_webrtc_call({
            'call_sid': call_sid,
            'from': from_number,
            'to': to_number
        }, lesson_context)
        
        if config['status'] == 'success':
            # TwiML odpověď pro WebRTC
            twiml_response = f'''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="cs-CZ" voice="Google.cs-CZ-Standard-A">Připojuji vás k AI asistentovi přes WebRTC.</Say>
    <Connect>
        <Stream 
            name="webrtc_stream"
            url="wss://{request.host}/webrtc/stream/{call_sid}"
            track="both_tracks"
        />
    </Connect>
</Response>'''
            
            return twiml_response, 200, {'Content-Type': 'application/xml'}
        else:
            logger.error(f"Chyba při konfiguraci WebRTC: {config['message']}")
            return "Error", 500
            
    except Exception as e:
        logger.error(f"Chyba při zpracování WebRTC hovoru: {str(e)}")
        return "Error", 500

@webrtc_bp.route('/stream/<call_sid>')
async def webrtc_stream(call_sid):
    """WebSocket endpoint pro WebRTC stream."""
    try:
        from flask_socketio import emit, disconnect
        from flask import current_app
        
        logger.info(f"WebRTC stream připojen pro call: {call_sid}")
        
        handler = webrtc_handlers.get(call_sid)
        if not handler:
            logger.error(f"Handler nenalezen pro call: {call_sid}")
            disconnect()
            return
            
        # Zde by byla implementace WebSocket komunikace s Twilio
        # a přeposílání audio dat do WebRTC service
        
        emit('webrtc_connected', {'call_sid': call_sid})
        
    except Exception as e:
        logger.error(f"Chyba ve WebRTC stream: {str(e)}")
        disconnect()

@webrtc_bp.route('/offer', methods=['POST'])
async def create_webrtc_offer():
    """Vytvoří WebRTC offer."""
    try:
        data = request.get_json()
        call_sid = data.get('call_sid')
        
        handler = webrtc_handlers.get(call_sid)
        if not handler:
            return jsonify({'error': 'Handler nenalezen'}), 404
            
        offer = await handler.webrtc_service.create_offer()
        
        return jsonify({
            'status': 'success',
            'offer': offer
        })
        
    except Exception as e:
        logger.error(f"Chyba při vytváření offer: {str(e)}")
        return jsonify({'error': str(e)}), 500

@webrtc_bp.route('/answer', methods=['POST'])
async def handle_webrtc_answer():
    """Zpracuje WebRTC answer."""
    try:
        data = request.get_json()
        call_sid = data.get('call_sid')
        answer = data.get('answer')
        
        handler = webrtc_handlers.get(call_sid)
        if not handler:
            return jsonify({'error': 'Handler nenalezen'}), 404
            
        await handler.webrtc_service.handle_answer(answer)
        
        return jsonify({'status': 'success'})
        
    except Exception as e:
        logger.error(f"Chyba při zpracování answer: {str(e)}")
        return jsonify({'error': str(e)}), 500

@webrtc_bp.route('/ice-candidate', methods=['POST'])
async def add_ice_candidate():
    """Přidá ICE candidate."""
    try:
        data = request.get_json()
        call_sid = data.get('call_sid')
        candidate = data.get('candidate')
        
        handler = webrtc_handlers.get(call_sid)
        if not handler:
            return jsonify({'error': 'Handler nenalezen'}), 404
            
        await handler.webrtc_service.add_ice_candidate(candidate)
        
        return jsonify({'status': 'success'})
        
    except Exception as e:
        logger.error(f"Chyba při přidávání ICE candidate: {str(e)}")
        return jsonify({'error': str(e)}), 500

@webrtc_bp.route('/hangup', methods=['POST'])
async def handle_hangup():
    """Zpracuje ukončení hovoru."""
    try:
        data = request.get_json()
        call_sid = data.get('call_sid')
        
        handler = webrtc_handlers.get(call_sid)
        if handler:
            await handler.cleanup()
            del webrtc_handlers[call_sid]
            
        return jsonify({'status': 'success'})
        
    except Exception as e:
        logger.error(f"Chyba při ukončování hovoru: {str(e)}")
        return jsonify({'error': str(e)}), 500

@webrtc_bp.route('/status/<call_sid>')
def get_webrtc_status(call_sid):
    """Vrací status WebRTC spojení."""
    try:
        handler = webrtc_handlers.get(call_sid)
        if not handler:
            return jsonify({'status': 'not_found'})
            
        return jsonify({
            'status': 'active',
            'connected': handler.webrtc_service.is_connected,
            'call_sid': call_sid
        })
        
    except Exception as e:
        logger.error(f"Chyba při získávání statusu: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Cleanup funkce pro ukončení všech aktivních spojení
@webrtc_bp.teardown_app_request
async def cleanup_webrtc_connections(exception):
    """Vyčistí WebRTC spojení při ukončení aplikace."""
    try:
        for call_sid, handler in webrtc_handlers.items():
            await handler.cleanup()
        webrtc_handlers.clear()
    except Exception as e:
        logger.error(f"Chyba při čištění WebRTC spojení: {str(e)}") 