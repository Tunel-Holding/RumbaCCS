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
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Calendar } from 'react-native-calendars';

export default function CalendarModal({ visible, onClose }) {
  const today = new Date();
  // Get local date string in YYYY-MM-DD format
  const pad = n => n < 10 ? '0' + n : n;
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  if (!visible) return null;

  return (
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.87)',
      zIndex: 200,
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <View style={{
        backgroundColor: '#1e293b',
        borderRadius: 24,
  padding: 12,
        minWidth: 320,
        maxWidth: '90%',
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 12,
        position: 'relative',
      }}>
        <TouchableOpacity
          onPress={onClose}
          style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={{ fontSize: 28, color: '#fff', fontWeight: 'bold' }}>×</Text>
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 18, textAlign: 'center' }}>Calendario</Text>
        <Calendar
          current={todayStr}
          markedDates={{
            [todayStr]: { selected: true, selectedColor: '#6366f1' }
          }}
          enableSwipeMonths={true}
          pagingEnabled={true}
          monthFormat={'MMMM yyyy'}
          theme={{
            calendarBackground: '#1e293b',
            dayTextColor: '#fff',
            monthTextColor: '#fff',
            selectedDayBackgroundColor: '#6366f1',
            selectedDayTextColor: '#fff',
            todayTextColor: '#ff007f',
            arrowColor: '#fff',
          }}
        />
      </View>
    </View>
  );
}
