import { LocaleConfig } from 'react-native-calendars';
// Configuración de español para el calendario
LocaleConfig.locales['es'] = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions, ScrollView, Modal } from 'react-native';
import { Calendar } from 'react-native-calendars';

const { width } = Dimensions.get('window');

export default function CalendarModal({ visible, onClose, eventsByDate = {}, onPressEvent }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [listVisible, setListVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const today = new Date();
  const pad = n => n < 10 ? '0' + n : n;
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  // Animación de entrada
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  // Seleccionar hoy por defecto al abrir
  useEffect(() => {
    if (visible) {
      setSelectedDate(todayStr);
    }
  }, [visible]);

  // Construir markedDates combinando fechas con eventos y la fecha seleccionada
  const markedDates = useMemo(() => {
    const marks = {};
    Object.keys(eventsByDate || {}).forEach((date) => {
      marks[date] = { ...(marks[date] || {}), marked: true, dotColor: '#22c55e' };
    });
    if (selectedDate) {
      marks[selectedDate] = {
        ...(marks[selectedDate] || {}),
        selected: true,
        selectedColor: '#6366f1',
        selectedTextColor: '#fff',
      };
    }
    return marks;
  }, [eventsByDate, selectedDate]);

  const onMonthChange = (month) => {
    // Animación de transición al cambiar mes
    const monthAnim = new Animated.Value(0);
    
    Animated.sequence([
      Animated.timing(monthAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(monthAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    setCurrentMonth(new Date(month.timestamp));
  };

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
  };

  const dayEvents = useMemo(() => {
    return (selectedDate && eventsByDate[selectedDate]) ? eventsByDate[selectedDate] : [];
  }, [eventsByDate, selectedDate]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.87)',
          zIndex: 200,
          justifyContent: 'center',
          alignItems: 'center',
          opacity: fadeAnim,
        }}
      >
      <Animated.View 
        style={{
          backgroundColor: '#1e293b',
          borderRadius: 24,
          padding: 16,
          minWidth: 320,
          maxWidth: '90%',
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 16,
          elevation: 12,
          position: 'relative',
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ],
        }}
      >
        <TouchableOpacity
          onPress={onClose}
          style={{ 
            position: 'absolute', 
            top: 16, 
            right: 16, 
            zIndex: 10,
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={{ fontSize: 20, color: '#fff', fontWeight: 'bold' }}>×</Text>
        </TouchableOpacity>
        
        <Text style={{ 
          color: '#fff', 
          fontSize: 24, 
          fontWeight: 'bold', 
          marginBottom: 20, 
          textAlign: 'center',
          marginTop: 8,
        }}>
          Calendario
        </Text>
        
        <Calendar
          current={todayStr}
          markingType={'dot'}
          markedDates={markedDates}
          onDayPress={onDayPress}
          onMonthChange={onMonthChange}
          pagingEnabled={true}
          monthFormat={'MMMM yyyy'}
          hideExtraDays={true}
          disableMonthChange={false}
          firstDay={1}
          hideDayNames={false}
          showWeekNumbers={false}
          disableArrowLeft={false}
          disableArrowRight={false}
          disableAllTouchEventsForDisabledDays={true}
          enableSwipeMonths={true}
          theme={{
            backgroundColor: 'transparent',
            calendarBackground: 'transparent',
            textSectionTitleColor: '#fff',
            textSectionTitleDisabledColor: '#666',
            selectedDayBackgroundColor: '#6366f1',
            selectedDayTextColor: '#fff',
            todayTextColor: '#ff007f',
            dayTextColor: '#fff',
            textDisabledColor: '#666',
            dotColor: '#6366f1',
            selectedDotColor: '#fff',
            arrowColor: '#fff',
            monthTextColor: '#fff',
            indicatorColor: '#6366f1',
            textDayFontFamily: 'System',
            textMonthFontFamily: 'System',
            textDayHeaderFontFamily: 'System',
            textDayFontWeight: '300',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '500',
            textDayFontSize: 16,
            textMonthFontSize: 18,
            textDayHeaderFontSize: 14,
            'stylesheet.calendar.header': {
              week: {
                marginTop: 5,
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingHorizontal: 10,
              }
            },
            'stylesheet.day.basic': {
              base: {
                width: 32,
                height: 32,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 16,
              },
              text: {
                marginTop: 4,
                fontSize: 16,
                fontWeight: '300',
                color: '#fff',
                backgroundColor: 'transparent',
              },
              selected: {
                backgroundColor: '#6366f1',
                borderRadius: 16,
              },
              today: {
                backgroundColor: 'rgba(255, 0, 127, 0.2)',
                borderRadius: 16,
              },
              disabled: {
                color: '#666',
              },
            },
            'stylesheet.month': {
              monthView: {
                backgroundColor: 'transparent',
              },
              week: {
                marginTop: 2,
                marginBottom: 2,
                flexDirection: 'row',
                justifyContent: 'space-around',
              },
            },
          }}
        />

        {/* Botón para ver eventos del día seleccionado en una lista aparte */}
        <View style={{ marginTop: 16 }}>
          {selectedDate ? (
            dayEvents && dayEvents.length > 0 ? (
              <TouchableOpacity
                onPress={() => setListVisible(true)}
                activeOpacity={0.85}
                style={{ backgroundColor: '#6366f1', paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Ver eventos para este día</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ color: '#94a3b8' }}>No hay eventos guardados para este día.</Text>
            )
          ) : (
            <Text style={{ color: '#94a3b8' }}>Selecciona una fecha.</Text>
          )}
        </View>
      </Animated.View>

      {/* Modal de lista de eventos para el día seleccionado */}
      <Modal
        visible={listVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setListVisible(false)}
      >
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.7)', justifyContent:'center', alignItems:'center' }}>
          <View style={{ backgroundColor:'#1e293b', borderRadius:16, padding:16, width:'90%', maxWidth:420, maxHeight:'75%' }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <Text style={{ color:'#fff', fontSize:18, fontWeight:'700' }}>Eventos para {selectedDate}</Text>
              <TouchableOpacity onPress={() => setListVisible(false)}>
                <Text style={{ color:'#fff', fontSize:22, fontWeight:'bold' }}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {(dayEvents || []).map((ev) => (
                <TouchableOpacity
                  key={`${ev.id || ev.eventoId}`}
                  onPress={() => {
                    if (onPressEvent) onPressEvent(ev);
                    setListVisible(false);
                  }}
                  activeOpacity={0.85}
                  style={{ backgroundColor:'#334155', borderRadius:12, padding:12, marginBottom:10 }}
                >
                  <Text style={{ color:'#e5e7eb', fontWeight:'600', fontSize:16 }}>
                    {ev.titulo || ev.title || 'Evento'}
                  </Text>
                  <Text style={{ color:'#cbd5e1', marginTop:4 }}>
                    {ev.time ? `⏰ ${ev.time}` : 'Hora no definida'}
                  </Text>
                  {ev.ubicacion && (
                    <Text style={{ color:'#cbd5e1', marginTop:2 }}>📍 {ev.ubicacion}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      </Animated.View>
    </Modal>
  );
}
