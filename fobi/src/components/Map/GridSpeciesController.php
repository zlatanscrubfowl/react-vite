<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GridSpeciesController extends Controller
{
    public function getSpeciesInChecklist($checklist_id)
    {
        try {
            \Log::info('Processing checklist_id:', ['id' => $checklist_id]);

            // Inisialisasi array untuk menyimpan semua species
            $allSpecies = collect();

            // Cek dan ambil data dari database second dan third jika ada
            if (!str_starts_with($checklist_id, 'fobi_')) {
                $speciesSecond = DB::connection('second')
                    ->table('checklist_fauna')
                    ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
                    ->where('checklist_fauna.checklist_id', str_replace('brn_', '', $checklist_id))
                    ->select(
                        'faunas.nameId',
                        'faunas.nameLat',
                        DB::raw("CONCAT('brn_', faunas.id) as id"),
                        'checklist_fauna.count',
                        DB::raw('NULL as notes')
                    )
                    ->get();

                $speciesThird = DB::connection('third')
                    ->table('checklist_fauna')
                    ->join('faunas', 'checklist_fauna.fauna_id', '=', 'faunas.id')
                    ->where('checklist_fauna.checklist_id', str_replace('kpn_', '', $checklist_id))
                    ->select(
                        'faunas.nameId',
                        'faunas.nameLat',
                        DB::raw("CONCAT('kpn_', faunas.id) as id"),
                        'checklist_fauna.count',
                        DB::raw('NULL as notes')
                    )
                    ->get();

                if (strpos($checklist_id, 'brn_') === 0) {
                    $allSpecies = $speciesSecond;
                } elseif (strpos($checklist_id, 'kpn_') === 0) {
                    $allSpecies = $speciesThird;
                } else {
                    $allSpecies = collect();
                }
            }

            // Cek dan ambil data dari FOBI jika ada
            if (str_starts_with($checklist_id, 'fobi_')) {
                $originalId = preg_replace('/^fobi_(b|k|t)_/', '', $checklist_id);

                if (str_starts_with($checklist_id, 'fobi_b_')) {
                    $speciesFobi = DB::table('fobi_checklist_faunasv1')
                        ->join('faunas', 'fobi_checklist_faunasv1.fauna_id', '=', 'faunas.id')
                        ->where('fobi_checklist_faunasv1.checklist_id', $originalId)
                        ->select(
                            'faunas.nameId',
                            'faunas.nameLat',
                            'faunas.id',
                            'fobi_checklist_faunasv1.count',
                            'fobi_checklist_faunasv1.notes'
                        )
                        ->get();
                    $allSpecies = $allSpecies->concat($speciesFobi);
                }
                elseif (str_starts_with($checklist_id, 'fobi_k_')) {
                    $speciesFobi = DB::table('fobi_checklist_faunasv2')
                        ->join('faunas_kupnes', 'fobi_checklist_faunasv2.fauna_id', '=', 'faunas_kupnes.id')
                        ->where('fobi_checklist_faunasv2.checklist_id', $originalId)
                        ->select(
                            'faunas_kupnes.nameId',
                            'faunas_kupnes.nameLat',
                            'faunas_kupnes.id',
                            'fobi_checklist_faunasv2.count',
                            'fobi_checklist_faunasv2.notes'
                        )
                        ->get();
                    $allSpecies = $allSpecies->concat($speciesFobi);
                }
                elseif (str_starts_with($checklist_id, 'fobi_t_')) {
                    $speciesFobi = DB::table('fobi_checklist_taxas')
                        ->where('id', $originalId)
                        ->select(
                            'species as nameId',
                            'scientific_name as nameLat',
                            'id',
                            DB::raw('1 as count'),
                            'observation_details as notes'
                        )
                        ->get();
                    $allSpecies = $allSpecies->concat($speciesFobi);
                }
            }

            // Log untuk debugging
            \Log::info('Species counts:', [
                'total_species' => $allSpecies->count(),
                'checklist_id' => $checklist_id
            ]);

            return response()->json($allSpecies);
        } catch (\Exception $e) {
            \Log::error('Error in GridSpeciesController:', [
                'error' => $e->getMessage(),
                'checklist_id' => $checklist_id
            ]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
