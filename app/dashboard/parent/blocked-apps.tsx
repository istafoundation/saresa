import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Switch, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { COLORS, FONTS } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { AppBlocker } from '../../../modules/app-blocker/src';

export default function BlockedAppsScreen() {
    const { childId } = useLocalSearchParams<{ childId: string }>();
    const router = useRouter();
    
    // Fetch installed apps from native module
    const [installedApps, setInstalledApps] = useState<{name: string, packageName: string}[]>([]);
    const [isLoadingApps, setIsLoadingApps] = useState(true);
    
    // Fetch currently blocked apps from Convex
    const children = useQuery(api.parents.getMyChildren);
    const updateBlockedAppsMutation = useMutation(api.parents.updateBlockedApps);
    const syncAppsMutation = useMutation(api.parents.updateInstalledApps);

    // Get current child's blocked apps
    const currentChild = children?.find(c => c._id === childId);
    const [blockedApps, setBlockedApps] = useState<string[]>([]);
    
    // Sync convex state to local state
    useEffect(() => {
        if (currentChild?.blockedApps) {
            setBlockedApps(currentChild.blockedApps);
            // Also sync to native module immediately if we are on the same device
            if (AppBlocker && AppBlocker.setBlockedApps) {
                AppBlocker.setBlockedApps(currentChild.blockedApps || []);
            }
        }
    }, [currentChild]);

    useEffect(() => {
        loadInstalledApps();
    }, []);

    const loadInstalledApps = async () => {
        if (AppBlocker && AppBlocker.getInstalledApps) {
            try {
                const apps = await AppBlocker.getInstalledApps();
                // Sort apps alphabetically
                apps.sort((a: any, b: any) => a.name.localeCompare(b.name));
                setInstalledApps(apps);
                
                // Sync to backend for web dashboard
                if (childId && childId !== "current") {
                     syncAppsMutation({
                        childId: childId as any,
                        apps: apps,
                     }).catch(err => console.error("Failed to sync apps", err));
                }
            } catch (error) {
                console.error("Failed to load apps", error);
                Alert.alert("Error", "Could not load installed apps.");
            } finally {
                setIsLoadingApps(false);
            }
        } else {
            // Mock for dev/web
            setInstalledApps([
                { name: 'YouTube', packageName: 'com.google.android.youtube' },
                { name: 'Instagram', packageName: 'com.instagram.android' },
                { name: 'Chrome', packageName: 'com.android.chrome' },
            ]);
            setIsLoadingApps(false);
        }
    };

    const toggleBlock = async (packageName: string, isBlocked: boolean) => {
        // Optimistic update
        const newBlockedList = isBlocked 
            ? [...blockedApps, packageName]
            : blockedApps.filter(p => p !== packageName);
            
        setBlockedApps(newBlockedList);
        
        // Update Native Module
        if (AppBlocker && AppBlocker.setBlockedApps) {
             AppBlocker.setBlockedApps(newBlockedList);
        }

        // Update Backend
        try {
            await updateBlockedAppsMutation({
                childId: childId as any,
                blockedApps: newBlockedList,
            });
        } catch (error) {
            console.error("Failed to update blocked apps", error);
            Alert.alert("Error", "Failed to save changes.");
            // Revert on error (could be improved)
        }
    };

    const requestPermission = async () => {
        if (AppBlocker && AppBlocker.requestUsagePermission) {
            AppBlocker.requestUsagePermission();
        } else {
            Alert.alert("Not Supported", "Native module not available");
        }
    };

    const startMonitoring = async () => {
         if (AppBlocker && AppBlocker.startMonitoring) {
             await AppBlocker.startMonitoring();
             Alert.alert("Monitoring Started", "Background service is running.");
         }
    }

    const renderItem = ({ item }: { item: { name: string, packageName: string } }) => {
        const isBlocked = blockedApps.includes(item.packageName);
        
        return (
            <View style={styles.appItem}>
                <View style={styles.appInfo}>
                    <Text style={styles.appName}>{item.name}</Text>
                    <Text style={styles.packageName}>{item.packageName}</Text>
                </View>
                <Switch 
                    value={isBlocked}
                    onValueChange={(val) => toggleBlock(item.packageName, val)}
                    trackColor={{ false: "#767577", true: COLORS.error }}
                />
            </View>
        );
    };

    if (isLoadingApps) {
        return (
            <View style={styles.loadingContainer}>
                <Stack.Screen options={{ title: 'Manage Blocked Apps' }} />
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
             <Stack.Screen options={{ 
                headerTitle: 'Blocked Apps',
                headerTintColor: COLORS.text,
                headerStyle: { backgroundColor: COLORS.background },
            }} />
            
            <View style={styles.header}>
                <Text style={styles.headerText}>
                    Toggle apps to block them on this device.
                </Text>
                <TouchableOpacity onPress={requestPermission} style={styles.permButton}>
                    <Text style={styles.permButtonText}>Grant Permissions</Text>
                </TouchableOpacity>
                 <TouchableOpacity onPress={startMonitoring} style={styles.startButton}>
                    <Text style={styles.startButtonText}>Enable Service</Text>
                </TouchableOpacity>
            </View>
            
            <FlatList
                data={installedApps}
                renderItem={renderItem}
                keyExtractor={item => item.packageName}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        gap: 10,
    },
    headerText: {
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        marginBottom: 8,
    },
    permButton: {
        backgroundColor: COLORS.primary,
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    permButtonText: {
        color: '#FFF',
        fontFamily: FONTS.bold,
    },
    startButton: {
        backgroundColor: COLORS.success,
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    startButtonText: {
         color: '#FFF',
        fontFamily: FONTS.bold,
    },
    listContent: {
        padding: 16,
    },
    appItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    appInfo: {
        flex: 1,
        marginRight: 12,
    },
    appName: {
        fontFamily: FONTS.bold,
        fontSize: 16, // Reduced slightly if bold is too thick
        color: COLORS.text,
    },
    packageName: {
        fontFamily: FONTS.regular,
        fontSize: 12,
        color: COLORS.textSecondary,
    },
});
