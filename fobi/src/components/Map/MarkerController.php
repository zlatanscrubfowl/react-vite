<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class MarkerController extends Controller
{
    public function getMarkers()
    {
        try {
            $checklistsAka = DB::connection('second')
                ->table('checklists')
                ->select(
                    'checklists.latitude',
                    'checklists.longitude',
                    DB::raw("CONCAT('brn_', checklists.id) as id"),
                    'checklists.created_at',
                    DB::raw("'burungnesia' as source")
                )
                ->whereExists(function ($query) {
                    $query->select(DB::raw(1))
                        ->from('checklist_fauna')
                        ->whereColumn('checklist_fauna.checklist_id', 'checklists.id')
                        ->limit(1);
                })
                ->get();

            $checklistsKupnes = DB::connection('third')
                ->table('checklists')
                ->select(
                    'checklists.latitude',
                    'checklists.longitude',
                    DB::raw("CONCAT('kpn_', checklists.id) as id"),
                    'checklists.created_at',
                    DB::raw("'kupunesia' as source")
                )
                ->whereExists(function ($query) {
                    $query->select(DB::raw(1))
                        ->from('checklist_fauna')
                        ->whereColumn('checklist_fauna.checklist_id', 'checklists.id')
                        ->limit(1);
                })
                ->get();

            $markers = cache()->remember('markers', 3600, function () use ($checklistsAka, $checklistsKupnes) {
                return $checklistsAka->merge($checklistsKupnes);
            });

            return response()->json($markers);
        } catch (\Exception $e) {
            \Log::error('Error in MarkerController:', ['error' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
