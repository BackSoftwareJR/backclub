<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Cache;

class TestController extends Controller
{
    public function index()
    {
        $results = [
            'timestamp' => now()->toDateTimeString(),
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            'environment' => app()->environment(),
        ];

        // Test Database Connection
        try {
            $dbTest = DB::select('SELECT 1 as test');
            $results['database'] = [
                'status' => 'connected',
                'driver' => Config::get('database.default'),
                'host' => Config::get('database.connections.' . Config::get('database.default') . '.host'),
                'database' => Config::get('database.connections.' . Config::get('database.default') . '.database'),
                'test_query' => 'success',
            ];

            // Test actual query
            try {
                $userCount = DB::table('users')->count();
                $results['database']['users_count'] = $userCount;
            } catch (\Exception $e) {
                $results['database']['users_query_error'] = $e->getMessage();
            }
        } catch (\Exception $e) {
            $results['database'] = [
                'status' => 'error',
                'error' => $e->getMessage(),
                'driver' => Config::get('database.default'),
            ];
        }

        // Test Composer/Autoload
        try {
            $results['composer'] = [
                'status' => 'loaded',
                'autoload' => class_exists('App\\Http\\Controllers\\AuthController') ? 'working' : 'error',
            ];
        } catch (\Exception $e) {
            $results['composer'] = [
                'status' => 'error',
                'error' => $e->getMessage(),
            ];
        }

        // Test Storage
        try {
            $storagePath = storage_path();
            $results['storage'] = [
                'status' => is_writable($storagePath) ? 'writable' : 'readonly',
                'path' => $storagePath,
            ];
        } catch (\Exception $e) {
            $results['storage'] = [
                'status' => 'error',
                'error' => $e->getMessage(),
            ];
        }

        // Test Cache
        try {
            Cache::put('test_key', 'test_value', 1);
            $cacheTest = Cache::get('test_key');
            $results['cache'] = [
                'status' => $cacheTest === 'test_value' ? 'working' : 'error',
            ];
        } catch (\Exception $e) {
            $results['cache'] = [
                'status' => 'error',
                'error' => $e->getMessage(),
            ];
        }

        return response()->json($results, 200);
    }

    public function dbTest()
    {
        $result = [
            'timestamp' => date('Y-m-d H:i:s'),
            'php_version' => PHP_VERSION,
        ];

        // Test Laravel app
        try {
            $result['laravel_version'] = app()->version();
            $result['environment'] = app()->environment();
        } catch (\Exception $e) {
            $result['laravel_error'] = $e->getMessage();
        }

        // Get database config (without connecting)
        try {
            $dbDefault = Config::get('database.default', 'mysql');
            $dbConfig = Config::get('database.connections.' . $dbDefault, []);
            $result['database_config'] = [
                'driver' => $dbDefault,
                'host' => $dbConfig['host'] ?? 'not configured',
                'database' => $dbConfig['database'] ?? 'not configured',
                'port' => $dbConfig['port'] ?? 'not configured',
            ];
        } catch (\Exception $e) {
            $result['config_error'] = $e->getMessage();
        }

        // Test basic connection
        try {
            DB::connection()->getPdo();
            $result['connection'] = 'success';
        } catch (\Exception $e) {
            $result['connection'] = 'failed';
            $result['connection_error'] = $e->getMessage();
            $result['status'] = 'error';
            return response()->json($result, 200);
        }

        // Test simple query
        try {
            $test = DB::select('SELECT 1 as test');
            $result['query_test'] = 'success';
        } catch (\Exception $e) {
            $result['query_test'] = 'failed';
            $result['query_error'] = $e->getMessage();
        }

        // Test users table
        try {
            $userCount = DB::table('users')->count();
            $result['users_count'] = $userCount;
            $result['users_table'] = 'accessible';
        } catch (\Exception $e) {
            $result['users_table'] = 'error';
            $result['users_table_error'] = $e->getMessage();
        }

        $result['status'] = 'success';
        $result['message'] = 'Database test completed';

        return response()->json($result, 200);
    }
}

