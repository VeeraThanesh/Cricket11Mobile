import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Colors } from '../theme/styles';

// Screens
import HomeScreen from '../screens/home/HomeScreen';
import PlayerListScreen from '../screens/players/PlayerListScreen';
import AddPlayerScreen from '../screens/players/AddPlayerScreen';
import TeamListScreen from '../screens/teams/TeamListScreen';
import CreateTeamScreen from '../screens/teams/CreateTeamScreen';
import MatchListScreen from '../screens/matches/MatchListScreen';
import MatchSetupScreen from '../screens/matches/MatchSetupScreen';
import TossScreen from '../screens/matches/TossScreen';
import LiveScoringScreen from '../screens/matches/LiveScoringScreen';
import ScorecardScreen from '../screens/matches/ScorecardScreen';
import MatchResultScreen from '../screens/matches/MatchResultScreen';

export type MainStackParamList = {
  Tabs: undefined;
  AddPlayer: { player?: any };
  CreateTeam: { team?: any };
  MatchSetup: { match?: any };
  Toss: { matchId: string };
  LiveScoring: { matchId: string; inningsId: string };
  Scorecard: { matchId: string };
  MatchResult: { matchId: string };
};

export type TabParamList = {
  Home: undefined;
  Players: undefined;
  Teams: undefined;
  Matches: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠',
    Players: '👤',
    Teams: '🏏',
    Matches: '📋',
  };
  return null; // react-native-vector-icons setup needed; using emoji fallback via tab label
}

function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: 60,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: '🏠 Home' }} />
      <Tab.Screen name="Players" component={PlayerListScreen} options={{ tabBarLabel: '👤 Players' }} />
      <Tab.Screen name="Teams" component={TeamListScreen} options={{ tabBarLabel: '🏏 Teams' }} />
      <Tab.Screen name="Matches" component={MatchListScreen} options={{ tabBarLabel: '📋 Matches' }} />
    </Tab.Navigator>
  );
}

export default function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primaryDark },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '700' },
      }}>
      <Stack.Screen name="Tabs" component={BottomTabs} options={{ headerShown: false }} />
      <Stack.Screen name="AddPlayer" component={AddPlayerScreen} options={{ title: 'Player' }} />
      <Stack.Screen name="CreateTeam" component={CreateTeamScreen} options={{ title: 'Team' }} />
      <Stack.Screen name="MatchSetup" component={MatchSetupScreen} options={{ title: 'New Match' }} />
      <Stack.Screen name="Toss" component={TossScreen} options={{ title: 'Toss' }} />
      <Stack.Screen name="LiveScoring" component={LiveScoringScreen} options={{ title: 'Live Scoring', headerShown: false }} />
      <Stack.Screen name="Scorecard" component={ScorecardScreen} options={{ title: 'Scorecard' }} />
      <Stack.Screen name="MatchResult" component={MatchResultScreen} options={{ title: 'Result', headerShown: false }} />
    </Stack.Navigator>
  );
}
