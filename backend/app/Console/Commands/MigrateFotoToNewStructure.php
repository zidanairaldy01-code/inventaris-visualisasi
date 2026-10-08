<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\FotoAset;
use App\Models\FotoSaranaPrasarana;
use Illuminate\Support\Facades\Storage;

class MigrateFotoToNewStructure extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'foto:migrate-structure';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrate existing photos to new organized folder structure (img/aset, img/sarana-prasarana)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting photo migration to new folder structure...');
        $this->newLine();

        // Migrate Foto Aset
        $this->info('Migrating Foto Aset...');
        $this->migrateFotoAset();
        $this->newLine();

        // Migrate Foto Sarana Prasarana
        $this->info('Migrating Foto Sarana Prasarana...');
        $this->migrateFotoSaranaPrasarana();
        $this->newLine();

        $this->info('✓ Migration completed successfully!');
        return 0;
    }

    private function migrateFotoAset()
    {
        $fotos = FotoAset::all();
        $migrated = 0;
        $skipped = 0;
        $errors = 0;

        $bar = $this->output->createProgressBar($fotos->count());
        $bar->start();

        foreach ($fotos as $foto) {
            $oldPath = $foto->path_file;
            
            // Skip if already in new structure
            if (str_starts_with($oldPath, 'img/aset/')) {
                $skipped++;
                $bar->advance();
                continue;
            }

            // Skip if file doesn't exist
            if (!Storage::disk('public')->exists($oldPath)) {
                $this->newLine();
                $this->warn("File not found: {$oldPath}");
                $errors++;
                $bar->advance();
                continue;
            }

            // Generate new path
            $filename = basename($oldPath);
            $newPath = 'img/aset/' . $filename;

            try {
                // Move file to new location
                Storage::disk('public')->move($oldPath, $newPath);
                
                // Update database
                $foto->path_file = $newPath;
                $foto->save();
                
                $migrated++;
            } catch (\Exception $e) {
                $this->newLine();
                $this->error("Error migrating {$oldPath}: " . $e->getMessage());
                $errors++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Foto Aset: {$migrated} migrated, {$skipped} skipped, {$errors} errors");
    }

    private function migrateFotoSaranaPrasarana()
    {
        $fotos = FotoSaranaPrasarana::all();
        $migrated = 0;
        $skipped = 0;
        $errors = 0;

        $bar = $this->output->createProgressBar($fotos->count());
        $bar->start();

        foreach ($fotos as $foto) {
            $oldPath = $foto->path_file;
            
            // Skip if already in new structure
            if (str_starts_with($oldPath, 'img/sarana-prasarana/')) {
                $skipped++;
                $bar->advance();
                continue;
            }

            // Skip if file doesn't exist
            if (!Storage::disk('public')->exists($oldPath)) {
                $this->newLine();
                $this->warn("File not found: {$oldPath}");
                $errors++;
                $bar->advance();
                continue;
            }

            // Generate new path
            $filename = basename($oldPath);
            $newPath = 'img/sarana-prasarana/' . $filename;

            try {
                // Move file to new location
                Storage::disk('public')->move($oldPath, $newPath);
                
                // Update database
                $foto->path_file = $newPath;
                $foto->save();
                
                $migrated++;
            } catch (\Exception $e) {
                $this->newLine();
                $this->error("Error migrating {$oldPath}: " . $e->getMessage());
                $errors++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Foto Sarana Prasarana: {$migrated} migrated, {$skipped} skipped, {$errors} errors");
    }
}
