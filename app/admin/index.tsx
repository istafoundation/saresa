
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Stack } from 'expo-router';

export default function AdminDashboard() {
  const publishContent = useAction(api.publish.publishToGitHub);
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      setError(null);
      setLastResult(null);
      
      const result = await publishContent({});
      setLastResult(result);
      Alert.alert("Success", "Content published to GitHub!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to publish");
      Alert.alert("Error", "Failed to publish content");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Admin Dashboard" }} />
      
      <Text style={styles.header}>Content Management</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Publish to GitHub Pages</Text>
        <Text style={styles.cardDesc}>
          Generates static JSON files for all levels and questions, and pushes them to the configured GitHub repository.
        </Text>
        
        <TouchableOpacity 
          style={[styles.button, isPublishing && styles.buttonDisabled]} 
          onPress={handlePublish}
          disabled={isPublishing}
        >
          {isPublishing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Publish Content Now</Text>
          )}
        </TouchableOpacity>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Error: {error}</Text>
          </View>
        )}

        {lastResult && (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>Publish Result:</Text>
            <Text style={styles.resultText}>Levels: {lastResult.publishedLevels}</Text>
            <Text style={styles.resultText}>Questions: {lastResult.totalQuestions}</Text>
            <Text style={styles.resultText}>Commit: {lastResult.commitSha?.substring(0, 7)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  cardDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBox: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#FFEBEE',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    color: '#C62828',
  },
  resultBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  resultTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2E7D32',
  },
  resultText: {
    color: '#2E7D32',
    fontFamily: 'monospace',
  },
});
